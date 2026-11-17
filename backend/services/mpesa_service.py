"""Safaricom Daraja M-Pesa STK Push Service."""
import base64
import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import requests
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

logger = logging.getLogger(__name__)


class MpesaService:
    """Encapsulates Daraja API authentication, STK push initiation, querying, and callback parsing."""

    def __init__(self):
        load_dotenv(override=True)
        self.env = os.getenv("MPESA_ENVIRONMENT", "sandbox").strip().lower()
        self.consumer_key = os.getenv("MPESA_CONSUMER_KEY", "").strip()
        self.consumer_secret = os.getenv("MPESA_CONSUMER_SECRET", "").strip()
        self.passkey = os.getenv("MPESA_PASSKEY", "").strip()
        self.business_short_code = os.getenv("MPESA_BUSINESS_SHORT_CODE", "174379").strip()
        self.callback_url = os.getenv("MPESA_CALLBACK_URL", "").strip()
        self.account_reference = os.getenv("MPESA_ACCOUNT_REFERENCE", "Cliff's Sharp Boy Association").strip()

        if self.env == "production":
            self.base_url = "https://api.safaricom.co.ke"
        else:
            self.base_url = "https://sandbox.safaricom.co.ke"

    def _get_access_token(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Request OAuth access token using HTTP Basic Auth with consumer credentials.
        Returns (access_token, error_message).
        """
        if not self.consumer_key or not self.consumer_secret:
            return None, "M-Pesa Consumer Key or Consumer Secret is not configured in backend environment."

        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            auth_string = f"{self.consumer_key}:{self.consumer_secret}"
            encoded_auth = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")
            headers = {"Authorization": f"Basic {encoded_auth}"}

            response = requests.get(url, headers=headers, timeout=20)
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                if token:
                    return token, None
                return None, "No access token in Safaricom OAuth response."
            
            logger.error("Daraja OAuth error HTTP %s: %s", response.status_code, response.text)
            return None, f"Failed to authenticate with Daraja (HTTP {response.status_code}). Please verify Daraja credentials."
        except requests.RequestException as e:
            logger.error("Connection error to Daraja OAuth: %s", str(e))
            return None, f"Could not connect to Safaricom Daraja API: {str(e)}"

    def _generate_password_and_timestamp(self) -> Tuple[str, str]:
        """Generate base64 encoded STK push password and current timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        data_to_encode = f"{self.business_short_code}{self.passkey}{timestamp}"
        encoded_password = base64.b64encode(data_to_encode.encode("utf-8")).decode("utf-8")
        return encoded_password, timestamp

    def initiate_stk_push(
        self,
        phone_number: str,
        amount: float,
        account_reference: Optional[str] = None,
        transaction_desc: str = "Contact Payment"
    ) -> Dict[str, Any]:
        """
        Initiate an STK Push payment prompt to customer phone.
        Returns dictionary with success flag, message, and identifiers.
        """
        # Validate configuration
        if not self.passkey:
            return {
                "success": False,
                "message": "MPESA_PASSKEY is not configured in backend .env."
            }
        if not self.callback_url:
            return {
                "success": False,
                "message": "MPESA_CALLBACK_URL is not configured in backend .env."
            }

        # Obtain token
        token, err = self._get_access_token()
        if err:
            return {"success": False, "message": err}

        password, timestamp = self._generate_password_and_timestamp()

        # Daraja STK Push endpoint
        stk_url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Sanitize account reference (allow alphanumeric, spaces, dashes, and apostrophes up to 30 chars)
        raw_ref = (account_reference or self.account_reference or "Cliff's Sharp Boy Association").strip()
        safe_ref = "".join(ch for ch in raw_ref if ch.isalnum() or ch in " _-'")[:30] or "Cliff"
        safe_desc = transaction_desc[:30]

        payload = {
            "BusinessShortCode": self.business_short_code,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(round(amount)),
            "PartyA": phone_number,
            "PartyB": self.business_short_code,
            "PhoneNumber": phone_number,
            "CallBackURL": self.callback_url,
            "AccountReference": safe_ref,
            "TransactionDesc": safe_desc
        }

        try:
            response = requests.post(stk_url, json=payload, headers=headers, timeout=30)
            res_data = response.json()

            if response.status_code == 200 and res_data.get("ResponseCode") == "0":
                return {
                    "success": True,
                    "message": "M-Pesa payment prompt sent successfully.",
                    "customer_message": res_data.get("CustomerMessage", "Check recipient's phone to complete payment."),
                    "checkout_request_id": res_data.get("CheckoutRequestID"),
                    "merchant_request_id": res_data.get("MerchantRequestID"),
                    "phone_number": phone_number,
                    "amount": amount
                }
            
            error_msg = res_data.get("errorMessage") or res_data.get("ResponseDescription") or f"HTTP {response.status_code}"
            logger.warning("Daraja STK push rejected: %s", error_msg)
            return {
                "success": False,
                "message": f"M-Pesa rejected request: {error_msg}"
            }
        except requests.RequestException as e:
            logger.error("STK Push request network failure: %s", str(e))
            return {
                "success": False,
                "message": f"Network error contacting M-Pesa Daraja service: {str(e)}"
            }

    def query_transaction_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """
        Query the Daraja STK Push status directly if callback is pending.
        """
        token, err = self._get_access_token()
        if err:
            return {"success": False, "message": err}

        password, timestamp = self._generate_password_and_timestamp()
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "BusinessShortCode": self.business_short_code,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=20)
            res_data = response.json()
            return {
                "success": response.status_code == 200,
                "data": res_data
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def parse_callback_payload(callback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract clean transaction details from Safaricom callback payload.
        Handles both success and cancellation/failure responses.
        """
        stk_callback = callback_data.get("Body", {}).get("stkCallback", {})
        
        merchant_request_id = stk_callback.get("MerchantRequestID")
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc")

        metadata_items = (
            stk_callback.get("CallbackMetadata", {}).get("Item", [])
            if isinstance(stk_callback.get("CallbackMetadata"), dict)
            else []
        )

        metadata_map = {}
        for item in metadata_items:
            name = item.get("Name")
            val = item.get("Value")
            if name:
                metadata_map[name] = val

        amount = metadata_map.get("Amount")
        receipt_number = metadata_map.get("MpesaReceiptNumber")
        phone_number = str(metadata_map.get("PhoneNumber")) if metadata_map.get("PhoneNumber") else None
        
        raw_date = metadata_map.get("TransactionDate")
        parsed_date = None
        if raw_date:
            try:
                parsed_date = datetime.strptime(str(raw_date), "%Y%m%d%H%M%S")
            except Exception:
                parsed_date = None

        # Determine standard status
        if result_code == 0:
            status = "Successful"
        elif result_code in (1032, "1032"):
            status = "Cancelled"
        else:
            status = "Failed"

        return {
            "merchant_request_id": merchant_request_id,
            "checkout_request_id": checkout_request_id,
            "result_code": result_code,
            "result_description": result_desc,
            "status": status,
            "amount": float(amount) if amount is not None else None,
            "receipt_number": receipt_number,
            "phone_number": phone_number,
            "transaction_date": parsed_date
        }
