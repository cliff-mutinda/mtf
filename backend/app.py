"""Flask application factory and server entry point for Contact Management & M-Pesa STK Push API."""
import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

try:
    from .database import get_engine, init_db, get_session_factory, get_db
    from .model import User
    from .routes.contacts import contacts_bp
    from .routes.mpesa import mpesa_bp
    from .routes.auth import auth_bp
    from .utils.auth import login_required
except ImportError:
    from database import get_engine, init_db, get_session_factory, get_db
    from model import User
    from routes.contacts import contacts_bp
    from routes.mpesa import mpesa_bp
    from routes.auth import auth_bp
    from utils.auth import login_required

# Load environment configuration
load_dotenv()

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app")


def create_app(config_override=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Default configurations
    app.config["JSON_SORT_KEYS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "contactpay_production_secret_key_change_me_default")

    if config_override:
        app.config.update(config_override)

    # CORS configuration
    frontend_env = os.getenv("FRONTEND_URL", "http://localhost:5173")
    allowed_origins = [url.strip().rstrip("/") for url in frontend_env.split(",") if url.strip()]
    if "http://localhost:5173" not in allowed_origins:
        allowed_origins.append("http://localhost:5173")

    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
    )

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(contacts_bp)
    app.register_blueprint(mpesa_bp)

    # Safe idempotent table verification on startup
    if os.getenv("AUTO_INIT_DB", "true").lower() == "true":
        try:
            init_db()
            # Seed initial user if database has no users
            with get_db() as session:
                user_count = session.query(User).count()
                if user_count == 0:
                    init_user = os.getenv("INITIAL_ADMIN_USERNAME", "admin").strip()
                    init_pwd = os.getenv("INITIAL_ADMIN_PASSWORD", "admin123").strip()
                    new_user = User(username=init_user)
                    new_user.set_password(init_pwd)
                    session.add(new_user)
                    logger.info("Auto-seeded initial admin user '%s'", init_user)
        except Exception as e:
            logger.warning("Database auto-init deferred: %s", str(e))

    # Direct route aliases for /auth/* without /api prefix
    @app.route("/auth/login", methods=["POST"])
    def auth_login_alias():
        try:
            from .routes.auth import login
        except ImportError:
            from routes.auth import login
        return login()

    @app.route("/auth/register", methods=["POST"])
    def auth_register_alias():
        try:
            from .routes.auth import register
        except ImportError:
            from routes.auth import register
        return register()

    @app.route("/auth/logout", methods=["POST"])
    def auth_logout_alias():
        try:
            from .routes.auth import logout
        except ImportError:
            from routes.auth import logout
        return logout()

    @app.route("/auth/me", methods=["GET"])
    @login_required
    def auth_me_alias():
        try:
            from .routes.auth import get_me
        except ImportError:
            from routes.auth import get_me
        return get_me()

    # Route alias for /api/dashboard/stats
    @app.route("/api/dashboard/stats", methods=["GET"])
    @login_required
    def dashboard_stats_alias():
        try:
            from .routes.mpesa import get_dashboard_stats
        except ImportError:
            from routes.mpesa import get_dashboard_stats
        return get_dashboard_stats()

    # Health check endpoints for Render and API consumers
    @app.route("/health", methods=["GET"])
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "success": True,
            "status": "healthy",
            "message": "Backend is healthy",
            "service": "Contact Management & M-Pesa API",
            "environment": os.getenv("FLASK_ENV", "development")
        }), 200

    # Clean teardown for database scoped session
    @app.teardown_appcontext
    def remove_db_session(exception=None):
        try:
            session_factory = get_session_factory()
            session_factory.remove()
        except Exception:
            pass

    # Error Handlers with clean standardized JSON responses
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "message": getattr(error, "description", "Bad Request")
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            "success": False,
            "message": getattr(error, "description", "Authentication required.")
        }), 401

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "message": getattr(error, "description", "Resource not found.")
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "success": False,
            "message": "Method not allowed on this endpoint."
        }), 405

    @app.errorhandler(409)
    def conflict(error):
        return jsonify({
            "success": False,
            "message": getattr(error, "description", "Conflict with existing resource.")
        }), 409

    @app.errorhandler(422)
    def unprocessable_entity(error):
        return jsonify({
            "success": False,
            "message": getattr(error, "description", "Unprocessable entity. Validation failed.")
        }), 422

    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error("Internal Server Error: %s", str(error))
        return jsonify({
            "success": False,
            "message": "An internal server error occurred. Please try again later."
        }), 500

    # CLI command to initialize database tables
    @app.cli.command("init-db")
    def cli_init_db():
        """Initialize database tables."""
        init_db()
        print("Database tables created successfully.")

    # CLI command to create or update a user
    @app.cli.command("create-user")
    def cli_create_user():
        """Create a new user account interactively or via arguments."""
        username = input("Username: ").strip()
        import getpass
        password = getpass.getpass("Password: ").strip()
        if not username or not password:
            print("Error: Username and password are required.")
            return

        with get_db() as session:
            existing = session.query(User).filter_by(username=username).first()
            if existing:
                existing.set_password(password)
                print(f"Password updated for existing user '{username}'.")
            else:
                user = User(username=username)
                user.set_password(password)
                session.add(user)
                print(f"User '{username}' created successfully.")

    return app


# Application instance for running with python app.py or WSGI server
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    logger.info("Starting Flask backend on %s:%s", host, port)
    app.run(host=host, port=port, debug=debug)
