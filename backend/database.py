"""Database configuration and session management using SQLAlchemy."""
import os
import urllib.parse
from contextlib import contextmanager
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

# Load environment variables
load_dotenv()

Base = declarative_base()

_engine = None
_SessionFactory = None
_db_session = None


def get_database_url() -> str:
    """Construct MySQL database URL from environment variables."""
    custom_url = os.getenv("DATABASE_URL")
    if custom_url:
        return custom_url

    host = os.getenv("DATABASE_HOST", "localhost")
    port = os.getenv("DATABASE_PORT", "3306")
    name = os.getenv("DATABASE_NAME", "contacts_db")
    user = os.getenv("DATABASE_USERNAME", "root")
    password = os.getenv("DATABASE_PASSWORD", "")

    # URL-encode credentials to safely handle special characters
    encoded_user = urllib.parse.quote_plus(user)
    encoded_password = urllib.parse.quote_plus(password)

    if encoded_password:
        return f"mysql+pymysql://{encoded_user}:{encoded_password}@{host}:{port}/{name}?charset=utf8mb4"
    return f"mysql+pymysql://{encoded_user}@{host}:{port}/{name}?charset=utf8mb4"


def get_engine():
    """Get or create the SQLAlchemy engine."""
    global _engine
    if _engine is None:
        db_url = get_database_url()
        _engine = create_engine(
            db_url,
            pool_recycle=3600,
            pool_pre_ping=True,
            echo=os.getenv("SQL_DEBUG", "false").lower() == "true"
        )
    return _engine


def get_session_factory():
    """Get or create the scoped session factory."""
    global _SessionFactory, _db_session
    if _SessionFactory is None:
        engine = get_engine()
        _SessionFactory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        _db_session = scoped_session(_SessionFactory)
    return _db_session


@contextmanager
def get_db():
    """
    Context manager for database sessions.
    Automatically rolls back on exception and closes the session on exit.
    """
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db(engine=None):
    """
    Initialize database tables defined in models.
    """
    if engine is None:
        engine = get_engine()

    # Import models to ensure they are registered with Base.metadata
    try:
        from . import model  # noqa: F401
    except ImportError:
        import model  # noqa: F401
    Base.metadata.create_all(bind=engine)
