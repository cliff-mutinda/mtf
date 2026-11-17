"""Authentication routes for registration, login, logout, and current user profile."""
import logging
from flask import Blueprint, request, jsonify, g

try:
    from ..database import get_db
    from ..model import User
    from ..utils.auth import generate_token, login_required
except ImportError:
    from database import get_db
    from model import User
    from utils.auth import generate_token, login_required

logger = logging.getLogger("auth_routes")

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user by username and password.
    Returns timed token and user profile on success.
    """
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    # Input validations per task requirements
    if not username:
        return jsonify({
            "success": False,
            "message": "Please enter your username."
        }), 400

    if not password:
        return jsonify({
            "success": False,
            "message": "Please enter your password."
        }), 400

    try:
        with get_db() as session:
            user = session.query(User).filter_by(username=username).first()

            # Constant-time-like rejection: do not reveal if username exists
            if not user or not user.check_password(password):
                return jsonify({
                    "success": False,
                    "message": "Invalid username or password."
                }), 401

            token = generate_token(user.id, user.username)
            user_data = user.to_dict()

            logger.info("User '%s' logged in successfully.", user.username)
            return jsonify({
                "success": True,
                "message": "Login successful.",
                "token": token,
                "user": user_data
            }), 200

    except Exception as e:
        logger.error("Error during login for user '%s': %s", username, str(e))
        return jsonify({
            "success": False,
            "message": "Unable to connect to the server. Please try again."
        }), 500


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user account.
    Validates credentials, hashes the password, and creates the user record.
    """
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username:
        return jsonify({
            "success": False,
            "message": "Please enter your username."
        }), 400

    if len(username) < 3 or len(username) > 80:
        return jsonify({
            "success": False,
            "message": "Username must be between 3 and 80 characters."
        }), 400

    if not password:
        return jsonify({
            "success": False,
            "message": "Please enter your password."
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must be at least 6 characters long."
        }), 400

    try:
        with get_db() as session:
            existing = session.query(User).filter_by(username=username).first()
            if existing:
                return jsonify({
                    "success": False,
                    "message": "Username is already taken."
                }), 409

            user = User(username=username)
            user.set_password(password)
            session.add(user)
            session.flush()

            token = generate_token(user.id, user.username)
            user_data = user.to_dict()

            logger.info("New user '%s' registered successfully.", username)
            return jsonify({
                "success": True,
                "message": "User registered successfully.",
                "token": token,
                "user": user_data
            }), 201

    except Exception as e:
        logger.error("Error during registration for user '%s': %s", username, str(e))
        return jsonify({
            "success": False,
            "message": "Unable to connect to the server. Please try again."
        }), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Logout endpoint.
    Stateless tokens are cleared by client-side storage disposal;
    returns confirmation response.
    """
    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    """
    Get the currently authenticated user's profile.
    Requires a valid Bearer token.
    """
    try:
        with get_db() as session:
            user = session.query(User).filter_by(id=g.current_user_id).first()
            if not user:
                return jsonify({
                    "success": False,
                    "message": "User not found."
                }), 404

            return jsonify({
                "success": True,
                "user": user.to_dict()
            }), 200

    except Exception as e:
        logger.error("Error fetching user profile for user_id %s: %s", getattr(g, "current_user_id", None), str(e))
        return jsonify({
            "success": False,
            "message": "Unable to connect to the server. Please try again."
        }), 500
