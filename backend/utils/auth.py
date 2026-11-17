"""Authentication utilities: token generation, verification, and route protection decorators."""
import os
import logging
from functools import wraps
from flask import request, jsonify, g
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

logger = logging.getLogger("auth")

# Token validity: default 7 days in seconds
TOKEN_MAX_AGE_SECONDS = 7 * 24 * 3600


def get_serializer() -> URLSafeTimedSerializer:
    """Obtain URLSafeTimedSerializer configured with application SECRET_KEY."""
    secret_key = os.getenv("SECRET_KEY", "contactpay_production_secret_key_change_me_default").strip()
    return URLSafeTimedSerializer(secret_key, salt="contactpay-auth-salt")


def generate_token(user_id: int, username: str) -> str:
    """Generate a cryptographically signed timed token containing user claims."""
    s = get_serializer()
    return s.dumps({"user_id": user_id, "username": username})


def verify_token(token: str, max_age: int = TOKEN_MAX_AGE_SECONDS) -> dict | None:
    """
    Verify and unpack signed token.
    Returns payload dictionary if valid; None if expired or tampered.
    """
    if not token:
        return None
    s = get_serializer()
    try:
        return s.loads(token, max_age=max_age)
    except SignatureExpired:
        logger.info("Authentication token has expired.")
        return None
    except BadSignature:
        logger.warning("Invalid token signature detected.")
        return None
    except Exception as e:
        logger.warning("Token verification failure: %s", str(e))
        return None


def get_auth_token_from_request() -> str | None:
    """Extract Bearer token from HTTP Authorization header."""
    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header:
        return None

    parts = auth_header.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def login_required(f):
    """
    Decorator for Flask routes requiring user authentication.
    Validates the Bearer token and injects current_user into flask.g.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_auth_token_from_request()
        if not token:
            return jsonify({
                "success": False,
                "message": "Authentication required. Please log in."
            }), 401

        payload = verify_token(token)
        if not payload or not payload.get("user_id"):
            return jsonify({
                "success": False,
                "message": "Session expired or invalid. Please log in again."
            }), 401

        # Store authenticated identity in Flask context
        g.current_user_id = payload["user_id"]
        g.current_username = payload["username"]

        return f(*args, **kwargs)

    return decorated_function
