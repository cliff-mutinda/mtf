"""Contacts API routes for CRUD operations, search, pagination, and Google Contacts CSV import."""
import io
import csv
import logging
from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from sqlalchemy import or_, desc, asc

try:
    from ..database import get_db
    from ..model import Contact, MpesaTransaction
    from ..schema import ContactSchema, ContactCreateSchema, ContactUpdateSchema
    from ..utils.phone import normalize_phone_number
    from ..utils.auth import login_required
except ImportError:
    from database import get_db
    from model import Contact, MpesaTransaction
    from schema import ContactSchema, ContactCreateSchema, ContactUpdateSchema
    from utils.phone import normalize_phone_number
    from utils.auth import login_required

logger = logging.getLogger(__name__)
contacts_bp = Blueprint("contacts", __name__, url_prefix="/api/contacts")

contact_schema = ContactSchema()
contacts_schema = ContactSchema(many=True)
create_schema = ContactCreateSchema()
update_schema = ContactUpdateSchema()


def _extract_google_contacts_row(row_dict):
    """
    Extract only First Name, Middle Name, Last Name, and Phone 1 - Value from a CSV row.
    Case-insensitive header matching for Google Contacts CSV and standard variants.
    """
    clean_dict = {str(k).strip().lower(): (str(v).strip() if v is not None else "") for k, v in row_dict.items() if k}

    # First name lookups
    first_name = (
        clean_dict.get("first name") or
        clean_dict.get("given name") or
        clean_dict.get("first_name") or
        clean_dict.get("firstname") or ""
    )

    # Middle name lookups
    middle_name = (
        clean_dict.get("middle name") or
        clean_dict.get("additional name") or
        clean_dict.get("middle_name") or
        clean_dict.get("middlename") or ""
    )

    # Last name lookups
    last_name = (
        clean_dict.get("last name") or
        clean_dict.get("family name") or
        clean_dict.get("last_name") or
        clean_dict.get("lastname") or ""
    )

    # Phone lookups (prioritize Google Contacts Phone 1 - Value)
    phone = (
        clean_dict.get("phone 1 - value") or
        clean_dict.get("phone 1") or
        clean_dict.get("phone number") or
        clean_dict.get("phone_number") or
        clean_dict.get("mobile phone") or
        clean_dict.get("phone") or
        clean_dict.get("mobile") or ""
    )

    # If first_name is empty but Name or Full Name is present, split it
    if not first_name:
        full = clean_dict.get("name") or clean_dict.get("full name") or clean_dict.get("fullname") or ""
        if full:
            parts = full.split()
            first_name = parts[0]
            if len(parts) == 2:
                last_name = parts[1]
            elif len(parts) > 2:
                middle_name = parts[1]
                last_name = " ".join(parts[2:])

    return {
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "raw_phone": phone
    }


@contacts_bp.route("", methods=["GET"])
@login_required
def list_contacts():
    """
    List contacts with search, pagination, and sorting.
    Query parameters:
      - search: string (matches first_name, middle_name, last_name, phone_number)
      - page: int (default 1)
      - per_page: int (default 20, max 100)
      - sort_by: string (first_name, last_name, created_at, phone_number)
      - sort_dir: string (asc, desc)
    """
    search_query = request.args.get("search", "").strip()
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(100, max(1, request.args.get("per_page", 20, type=int)))
    sort_by = request.args.get("sort_by", "created_at")
    sort_dir = request.args.get("sort_dir", "desc").lower()

    with get_db() as session:
        query = session.query(Contact)

        if search_query:
            term = f"%{search_query}%"
            # Normalize query if user typed a phone number format
            norm_term = normalize_phone_number(search_query) or search_query
            query = query.filter(
                or_(
                    Contact.first_name.ilike(term),
                    Contact.middle_name.ilike(term),
                    Contact.last_name.ilike(term),
                    Contact.phone_number.ilike(f"%{norm_term}%")
                )
            )

        # Sorting column
        sort_col = getattr(Contact, sort_by, Contact.created_at)
        query = query.order_by(desc(sort_col) if sort_dir == "desc" else asc(sort_col))

        total = query.count()
        pages = (total + per_page - 1) // per_page if total > 0 else 1
        contacts = query.offset((page - 1) * per_page).limit(per_page).all()

        data = [c.to_dict() for c in contacts]

        return jsonify({
            "success": True,
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": pages
            }
        }), 200


@contacts_bp.route("/<int:contact_id>", methods=["GET"])
@login_required
def get_contact(contact_id: int):
    """Get single contact details including transaction history."""
    with get_db() as session:
        contact = session.query(Contact).filter_by(id=contact_id).first()
        if not contact:
            return jsonify({
                "success": False,
                "message": f"Contact with ID {contact_id} not found."
            }), 404

        result = contact.to_dict()
        # Include payment history for this contact
        transactions = session.query(MpesaTransaction)\
            .filter_by(contact_id=contact.id)\
            .order_by(desc(MpesaTransaction.created_at))\
            .all()
        result["transactions"] = [t.to_dict() for t in transactions]

        return jsonify({
            "success": True,
            "data": result
        }), 200


@contacts_bp.route("", methods=["POST"])
@login_required
def create_contact():
    """Create a new contact manually with strict validation and duplicate check."""
    json_data = request.get_json() or {}
    try:
        validated_data = create_schema.load(json_data)
    except ValidationError as err:
        return jsonify({
            "success": False,
            "message": "Validation error.",
            "errors": err.messages
        }), 422

    phone_number = validated_data["phone_number"]

    with get_db() as session:
        existing = session.query(Contact).filter_by(phone_number=phone_number).first()
        if existing:
            return jsonify({
                "success": False,
                "message": f"A contact with phone number {phone_number} already exists ({existing.full_name})."
            }), 409

        contact = Contact(
            first_name=validated_data["first_name"],
            middle_name=validated_data.get("middle_name") or "",
            last_name=validated_data.get("last_name") or "",
            phone_number=phone_number
        )
        session.add(contact)
        session.flush()

        return jsonify({
            "success": True,
            "message": "Contact created successfully.",
            "data": contact.to_dict()
        }), 201


@contacts_bp.route("/<int:contact_id>", methods=["PUT"])
@login_required
def update_contact(contact_id: int):
    """Update contact details with duplicate phone prevention."""
    json_data = request.get_json() or {}
    try:
        validated_data = update_schema.load(json_data)
    except ValidationError as err:
        return jsonify({
            "success": False,
            "message": "Validation error.",
            "errors": err.messages
        }), 422

    with get_db() as session:
        contact = session.query(Contact).filter_by(id=contact_id).first()
        if not contact:
            return jsonify({
                "success": False,
                "message": f"Contact with ID {contact_id} not found."
            }), 404

        new_phone = validated_data.get("phone_number")
        if new_phone and new_phone != contact.phone_number:
            # Check if another contact already has this phone number
            conflict = session.query(Contact)\
                .filter(Contact.phone_number == new_phone, Contact.id != contact_id)\
                .first()
            if conflict:
                return jsonify({
                    "success": False,
                    "message": f"Phone number {new_phone} is already assigned to {conflict.full_name}."
                }), 409
            contact.phone_number = new_phone

        if "first_name" in validated_data and validated_data["first_name"]:
            contact.first_name = validated_data["first_name"]
        if "middle_name" in validated_data:
            contact.middle_name = validated_data["middle_name"] or ""
        if "last_name" in validated_data:
            contact.last_name = validated_data["last_name"] or ""

        session.flush()

        return jsonify({
            "success": True,
            "message": "Contact updated successfully.",
            "data": contact.to_dict()
        }), 200


@contacts_bp.route("/<int:contact_id>", methods=["DELETE"])
@login_required
def delete_contact(contact_id: int):
    """Delete a contact with confirmation handling."""
    with get_db() as session:
        contact = session.query(Contact).filter_by(id=contact_id).first()
        if not contact:
            return jsonify({
                "success": False,
                "message": f"Contact with ID {contact_id} not found."
            }), 404

        session.delete(contact)
        return jsonify({
            "success": True,
            "message": f"Contact {contact.full_name} deleted successfully."
        }), 200


@contacts_bp.route("/preview-csv", methods=["POST"])
@login_required
def preview_csv():
    """
    Parse uploaded Google Contacts CSV file and return a preview with detected columns,
    valid rows, and statistics WITHOUT modifying the database.
    """
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No CSV file uploaded."}), 400

    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"success": False, "message": "File must be a valid .csv file."}), 400

    try:
        content = file.stream.read().decode("utf-8-sig", errors="replace")
        csv_reader = csv.DictReader(io.StringIO(content))
    except Exception as e:
        return jsonify({"success": False, "message": f"Could not read CSV file: {str(e)}"}), 400

    rows_preview = []
    total_rows = 0
    valid_count = 0
    invalid_count = 0
    in_file_duplicates = 0
    seen_phones = set()

    for row in csv_reader:
        total_rows += 1
        extracted = _extract_google_contacts_row(row)
        norm_phone = normalize_phone_number(extracted["raw_phone"])

        if not norm_phone or not extracted["first_name"]:
            invalid_count += 1
            status = "Invalid Phone/Name"
        elif norm_phone in seen_phones:
            in_file_duplicates += 1
            status = "Duplicate in File"
        else:
            seen_phones.add(norm_phone)
            valid_count += 1
            status = "Valid"

        if len(rows_preview) < 50:
            rows_preview.append({
                "first_name": extracted["first_name"],
                "middle_name": extracted["middle_name"],
                "last_name": extracted["last_name"],
                "phone_number": norm_phone or extracted["raw_phone"],
                "normalized": norm_phone is not None,
                "status": status
            })

    return jsonify({
        "success": True,
        "filename": file.filename,
        "total_rows": total_rows,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "in_file_duplicates": in_file_duplicates,
        "preview": rows_preview
    }), 200


@contacts_bp.route("/import", methods=["POST"])
@login_required
def import_contacts():
    """
    Import contacts from Google Contacts CSV file or parsed JSON data.
    Extracts only First Name, Middle Name, Last Name, Phone.
    Normalizes Kenyan phone numbers to canonical 254XXXXXXXXX.
    Removes duplicates in the file and skips contacts already present in the database.
    Returns exact import statistics.
    """
    contacts_to_process = []

    if "file" in request.files:
        file = request.files["file"]
        if not file.filename.lower().endswith(".csv"):
            return jsonify({"success": False, "message": "File must be a valid .csv file."}), 400
        try:
            content = file.stream.read().decode("utf-8-sig", errors="replace")
            csv_reader = csv.DictReader(io.StringIO(content))
            for row in csv_reader:
                extracted = _extract_google_contacts_row(row)
                contacts_to_process.append(extracted)
        except Exception as e:
            return jsonify({"success": False, "message": f"Could not parse CSV file: {str(e)}"}), 400
    else:
        json_data = request.get_json() or {}
        items = json_data.get("contacts", [])
        if not items:
            return jsonify({"success": False, "message": "No contacts data provided for import."}), 400
        for item in items:
            contacts_to_process.append({
                "first_name": item.get("first_name", "").strip(),
                "middle_name": item.get("middle_name", "").strip(),
                "last_name": item.get("last_name", "").strip(),
                "raw_phone": item.get("phone_number", "").strip()
            })

    total_rows = len(contacts_to_process)
    if total_rows == 0:
        return jsonify({
            "success": False,
            "message": "The uploaded CSV file is empty."
        }), 400

    distinct_in_file = {}
    invalid_contacts = 0
    duplicates_in_file = 0

    for item in contacts_to_process:
        first_name = item["first_name"]
        raw_phone = item["raw_phone"]
        norm_phone = normalize_phone_number(raw_phone)

        # Incomplete name is acceptable (e.g. only first name), but phone must be valid Kenyan number
        if not norm_phone or not first_name:
            invalid_contacts += 1
            continue

        if norm_phone in distinct_in_file:
            duplicates_in_file += 1
        else:
            distinct_in_file[norm_phone] = {
                "first_name": first_name[:100],
                "middle_name": item["middle_name"][:100] if item["middle_name"] else "",
                "last_name": item["last_name"][:100] if item["last_name"] else "",
                "phone_number": norm_phone
            }

    valid_contacts = len(distinct_in_file)

    # Check which phone numbers already exist in the database
    with get_db() as session:
        existing_numbers = set()
        if distinct_in_file:
            all_candidate_phones = list(distinct_in_file.keys())
            # Query in batches of 1000 to respect SQL parameter limits
            batch_size = 1000
            for i in range(0, len(all_candidate_phones), batch_size):
                chunk = all_candidate_phones[i:i + batch_size]
                found = session.query(Contact.phone_number).filter(Contact.phone_number.in_(chunk)).all()
                for row in found:
                    existing_numbers.add(row[0])

        new_contacts = []
        database_duplicates = 0

        for phone, cdata in distinct_in_file.items():
            if phone in existing_numbers:
                database_duplicates += 1
            else:
                new_contacts.append(
                    Contact(
                        first_name=cdata["first_name"],
                        middle_name=cdata["middle_name"],
                        last_name=cdata["last_name"],
                        phone_number=cdata["phone_number"]
                    )
                )

        if new_contacts:
            session.bulk_save_objects(new_contacts)
            session.flush()

        imported_count = len(new_contacts)
        total_duplicates_removed = duplicates_in_file + database_duplicates

        return jsonify({
            "success": True,
            "message": f"Successfully imported {imported_count} contact(s).",
            "summary": {
                "total_rows": total_rows,
                "valid_contacts": valid_contacts,
                "duplicates_removed": total_duplicates_removed,
                "invalid_contacts": invalid_contacts,
                "imported": imported_count
            }
        }), 200
