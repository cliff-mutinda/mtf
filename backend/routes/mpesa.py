"""M-Pesa API routes for STK push initiation, Daraja callback handling, transaction status, and dashboard stats."""
import os
import logging
from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from sqlalchemy import or_, desc, func

try:
    from ..database import get_db
    from ..model import Contact, MpesaTransaction
    from ..schema import MpesaSTKPushRequestSchema, MpesaTransactionSchema
    from ..services.mpesa_service import MpesaService
    from ..utils.auth import login_required
except ImportError:
    from database import get_db
    from model import Contact, MpesaTransaction
    from schema import MpesaSTKPushRequestSchema, MpesaTransactionSchema
    from services.mpesa_service import MpesaService
    from utils.auth import login_required

logger = logging.getLogger(__name__)
mpesa_bp = Blueprint("mpesa", __name__, url_prefix="/api/mpesa")

stk_schema = MpesaSTKPushRequestSchema()
transaction_schema = MpesaTransactionSchema()
transactions_schema = MpesaTransactionSchema(many=True)


@mpesa_bp.route("/stkpush", methods=["POST"])
@login_required
def initiate_stk_push():
    """
    Initiate M-Pesa STK Push to the contact's phone.
    Retrieves the verified phone number from the database contact record.
    Never exposes internal credentials or secrets to the client.
    """
    json_data = request.get_json() or {}
    try:
        validated_data = stk_schema.load(json_data)
    except ValidationError as err:
        return jsonify({
            "success": False,
            "message": "Validation error.",
            "errors": err.messages
        }), 422

    contact_id = validated_data["contact_id"]
    amount = float(validated_data["amount"])

    with get_db() as session:
        contact = session.query(Contact).filter_by(id=contact_id).first()
        if not contact:
            return jsonify({
                "success": False,
                "message": f"Contact with ID {contact_id} does not exist."
            }), 404

        # Important architecture requirement: Retrieve phone number strictly from database
        recipient_phone = contact.phone_number
        recipient_name = contact.full_name
        account_ref = os.getenv("MPESA_ACCOUNT_REFERENCE", "Cliff's Sharp Boy Association").strip() or recipient_name

        mpesa_svc = MpesaService()
        result = mpesa_svc.initiate_stk_push(
            recipient_phone,
            amount,
            account_ref,
            f"Payment for {recipient_name}"
        )

        if not result.get("success"):
            return jsonify({
                "success": False,
                "message": result.get("message", "Failed to initiate M-Pesa STK Push.")
            }), 400

        # Save initial pending transaction record in database
        transaction = MpesaTransaction(
            contact_id=contact.id,
            amount=amount,
            phone_number=recipient_phone,
            merchant_request_id=result.get("merchant_request_id", ""),
            checkout_request_id=result.get("checkout_request_id", ""),
            status="Pending"
        )
        session.add(transaction)
        session.flush()

        # Clean sanitized response to client
        return jsonify({
            "success": True,
            "message": "M-Pesa payment prompt sent successfully.",
            "customer_message": result.get("customer_message", "Check the recipient's phone to complete payment."),
            "checkout_request_id": transaction.checkout_request_id,
            "merchant_request_id": transaction.merchant_request_id,
            "status": "Pending",
            "amount": amount,
            "recipient_name": recipient_name,
            "phone_number": recipient_phone
        }), 200


@mpesa_bp.route("/callback", methods=["POST"])
def mpesa_callback():
    """
    Safaricom Daraja STK Push callback webhook.
    Receives JSON response from Safaricom, parses transaction outcome,
    updates transaction record, and acknowledges receipt.
    """
    callback_payload = request.get_json(silent=True) or {}
    logger.info("Received M-Pesa callback: %s", callback_payload)

    parsed = MpesaService.parse_callback_payload(callback_payload)
    checkout_request_id = parsed.get("checkout_request_id")

    if not checkout_request_id:
        logger.warning("Callback received without CheckoutRequestID")
        return jsonify({"ResultCode": 1, "ResultDesc": "Invalid callback structure"}), 400

    try:
        with get_db() as session:
            tx = session.query(MpesaTransaction).filter_by(checkout_request_id=checkout_request_id).first()
            if tx:
                tx.status = parsed.get("status", "Failed")
                tx.result_code = parsed.get("result_code")
                tx.result_description = parsed.get("result_description")
                if parsed.get("receipt_number"):
                    tx.receipt_number = parsed.get("receipt_number")
                if parsed.get("transaction_date"):
                    tx.transaction_date = parsed.get("transaction_date")
                session.flush()
                logger.info("Updated transaction %s status to %s", checkout_request_id, tx.status)
            else:
                logger.warning("Transaction with CheckoutRequestID %s not found in DB", checkout_request_id)
    except Exception as e:
        logger.error("Error processing M-Pesa callback: %s", str(e))
        return jsonify({"ResultCode": 1, "ResultDesc": "Internal error processing callback"}), 500

    return jsonify({"ResultCode": 0, "ResultDesc": "Callback processed successfully"}), 200


@mpesa_bp.route("/transactions", methods=["GET"])
@login_required
def list_transactions():
    """
    List M-Pesa transactions with search, status filtering, and pagination.
    Query parameters:
      - status: string (All, Pending, Successful, Failed, Cancelled)
      - search: string (matches recipient name, phone, receipt_number, checkout_request_id)
      - page: int
      - per_page: int
    """
    status_filter = request.args.get("status", "All").strip()
    search_query = request.args.get("search", "").strip()
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(100, max(1, request.args.get("per_page", 20, type=int)))

    with get_db() as session:
        query = session.query(MpesaTransaction).outerjoin(Contact, MpesaTransaction.contact_id == Contact.id)

        if status_filter and status_filter.lower() != "all":
            query = query.filter(MpesaTransaction.status.ilike(status_filter))

        if search_query:
            term = f"%{search_query}%"
            query = query.filter(
                or_(
                    Contact.first_name.ilike(term),
                    Contact.last_name.ilike(term),
                    MpesaTransaction.phone_number.ilike(term),
                    MpesaTransaction.receipt_number.ilike(term),
                    MpesaTransaction.checkout_request_id.ilike(term)
                )
            )

        query = query.order_by(desc(MpesaTransaction.created_at))
        total = query.count()
        pages = (total + per_page - 1) // per_page if total > 0 else 1
        records = query.offset((page - 1) * per_page).limit(per_page).all()

        data = [r.to_dict() for r in records]

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


@mpesa_bp.route("/transactions/<string:checkout_request_id>", methods=["GET"])
@login_required
def get_transaction_status(checkout_request_id: str):
    """
    Get live status for a specific M-Pesa transaction by CheckoutRequestID.
    If transaction is still Pending, optionally queries Daraja STK Query API.
    """
    with get_db() as session:
        tx = session.query(MpesaTransaction).filter_by(checkout_request_id=checkout_request_id).first()
        if not tx:
            return jsonify({
                "success": False,
                "message": f"Transaction with CheckoutRequestID '{checkout_request_id}' not found."
            }), 404

        # If still pending, try querying Daraja status if possible
        if tx.status == "Pending":
            try:
                svc = MpesaService()
                query_res = svc.query_transaction_status(checkout_request_id)
                if query_res.get("success"):
                    q_data = query_res.get("data", {})
                    res_code = q_data.get("ResultCode")
                    res_desc = q_data.get("ResultDesc")
                    if res_code is not None:
                        tx.result_code = int(res_code)
                        tx.result_description = res_desc
                        if str(res_code) == "0":
                            tx.status = "Successful"
                        elif str(res_code) in ("1032", 1032):
                            tx.status = "Cancelled"
                        else:
                            tx.status = "Failed"
                        session.flush()
            except Exception as e:
                logger.debug("Live query check skipped: %s", str(e))

        return jsonify({
            "success": True,
            "data": tx.to_dict()
        }), 200


@mpesa_bp.route("/dashboard/stats", methods=["GET"])
@login_required
def get_dashboard_stats():
    """
    Get real statistics from database for dashboard cards and recent activity.
    Never uses fake statistics.
    """
    with get_db() as session:
        total_contacts = session.query(func.count(Contact.id)).scalar() or 0
        total_transactions = session.query(func.count(MpesaTransaction.id)).scalar() or 0
        successful_payments = (
            session.query(func.count(MpesaTransaction.id))
            .filter(MpesaTransaction.status == "Successful")
            .scalar() or 0
        )
        pending_payments = (
            session.query(func.count(MpesaTransaction.id))
            .filter(MpesaTransaction.status == "Pending")
            .scalar() or 0
        )
        failed_payments = (
            session.query(func.count(MpesaTransaction.id))
            .filter(MpesaTransaction.status.in_(["Failed", "Cancelled"]))
            .scalar() or 0
        )
        total_amount = (
            session.query(func.sum(MpesaTransaction.amount))
            .filter(MpesaTransaction.status == "Successful")
            .scalar() or 0.0
        )

        recent_txs = (
            session.query(MpesaTransaction)
            .order_by(desc(MpesaTransaction.created_at))
            .limit(5)
            .all()
        )

        return jsonify({
            "success": True,
            "data": {
                "total_contacts": total_contacts,
                "total_transactions": total_transactions,
                "successful_payments": successful_payments,
                "pending_payments": pending_payments,
                "failed_payments": failed_payments,
                "total_amount_collected": float(total_amount),
                "recent_activity": [t.to_dict() for t in recent_txs]
            }
        }), 200
