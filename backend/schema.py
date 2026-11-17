"""Marshmallow schemas for API validation and serialization."""
from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
try:
    from .utils.phone import normalize_phone_number
except ImportError:
    from utils.phone import normalize_phone_number


class ContactSchema(Schema):
    """Schema for serializing Contact objects."""
    id = fields.Int(dump_only=True)
    first_name = fields.Str(required=True)
    middle_name = fields.Str(allow_none=True, dump_default="")
    last_name = fields.Str(allow_none=True, dump_default="")
    full_name = fields.Str(dump_only=True)
    phone_number = fields.Str(required=True)
    created_at = fields.Str(dump_only=True)
    updated_at = fields.Str(dump_only=True)


class ContactCreateSchema(Schema):
    """Schema for validating contact creation requests."""
    first_name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100, error="First name must be between 1 and 100 characters.")
    )
    middle_name = fields.Str(
        allow_none=True,
        load_default="",
        validate=validate.Length(max=100, error="Middle name must not exceed 100 characters.")
    )
    last_name = fields.Str(
        allow_none=True,
        load_default="",
        validate=validate.Length(max=100, error="Last name must not exceed 100 characters.")
    )
    phone_number = fields.Str(
        required=True,
        error_messages={"required": "Phone number is required."}
    )

    @validates("phone_number")
    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        if not normalized:
            raise ValidationError(
                "Invalid Kenyan phone number. Use format 07XXXXXXXX, 01XXXXXXXX, or +254XXXXXXXXX."
            )

    @post_load
    def clean_data(self, data, **kwargs):
        data["first_name"] = data["first_name"].strip()
        data["middle_name"] = (data.get("middle_name") or "").strip()
        data["last_name"] = (data.get("last_name") or "").strip()
        data["phone_number"] = normalize_phone_number(data["phone_number"])
        return data


class ContactUpdateSchema(Schema):
    """Schema for validating contact update requests."""
    first_name = fields.Str(
        validate=validate.Length(min=1, max=100, error="First name must be between 1 and 100 characters.")
    )
    middle_name = fields.Str(
        allow_none=True,
        validate=validate.Length(max=100, error="Middle name must not exceed 100 characters.")
    )
    last_name = fields.Str(
        allow_none=True,
        validate=validate.Length(max=100, error="Last name must not exceed 100 characters.")
    )
    phone_number = fields.Str()

    @validates("phone_number")
    def validate_phone(self, value):
        if value:
            normalized = normalize_phone_number(value)
            if not normalized:
                raise ValidationError(
                    "Invalid Kenyan phone number. Use format 07XXXXXXXX, 01XXXXXXXX, or +254XXXXXXXXX."
                )

    @post_load
    def clean_data(self, data, **kwargs):
        if "first_name" in data and data["first_name"]:
            data["first_name"] = data["first_name"].strip()
        if "middle_name" in data and data["middle_name"] is not None:
            data["middle_name"] = data["middle_name"].strip()
        if "last_name" in data and data["last_name"] is not None:
            data["last_name"] = data["last_name"].strip()
        if "phone_number" in data and data["phone_number"]:
            data["phone_number"] = normalize_phone_number(data["phone_number"])
        return data


class ContactImportItemSchema(Schema):
    """Schema for individual row in CSV import."""
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    middle_name = fields.Str(allow_none=True, load_default="")
    last_name = fields.Str(allow_none=True, load_default="")
    phone_number = fields.Str(required=True)


class MpesaSTKPushRequestSchema(Schema):
    """Schema for M-Pesa STK Push request validation."""
    contact_id = fields.Int(
        required=True,
        error_messages={"required": "Contact ID is required."}
    )
    amount = fields.Float(
        required=True,
        validate=validate.Range(min=1, error="Amount must be greater than zero (minimum 1 KSh)."),
        error_messages={"required": "Amount is required."}
    )


class MpesaTransactionSchema(Schema):
    """Schema for serializing M-Pesa transactions."""
    id = fields.Int(dump_only=True)
    contact_id = fields.Int(dump_only=True)
    recipient_name = fields.Str(dump_only=True)
    amount = fields.Float(dump_only=True)
    phone_number = fields.Str(dump_only=True)
    merchant_request_id = fields.Str(dump_only=True)
    checkout_request_id = fields.Str(dump_only=True)
    receipt_number = fields.Str(dump_only=True, allow_none=True)
    transaction_date = fields.Str(dump_only=True, allow_none=True)
    result_code = fields.Int(dump_only=True, allow_none=True)
    result_description = fields.Str(dump_only=True, allow_none=True)
    status = fields.Str(dump_only=True)
    created_at = fields.Str(dump_only=True)
    updated_at = fields.Str(dump_only=True)
