"""SQLAlchemy models for contacts, M-Pesa transactions, and authentication users."""
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Numeric,
    ForeignKey,
    Index,
    Text
)
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash

try:
    from .database import Base
except ImportError:
    from database import Base


class User(Base):
    """
    User model for username and password authentication.
    Passwords are always hashed with Werkzeug security utilities before persistence.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def set_password(self, password: str):
        """Hash and store the password using Werkzeug's secure hashing."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify candidate plaintext password against stored hash."""
        if not self.password_hash or not password:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Serialize user object without leaking password_hash."""
        return {
            "id": self.id,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"


class Contact(Base):
    """
    Contact model representing stored individuals.
    Normalized phone number has a unique constraint to prevent duplicate records.
    """
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False, index=True)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True, index=True)
    
    # Normalized canonical Kenyan phone number, e.g. '254712345678'
    phone_number = Column(String(20), unique=True, index=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship to M-Pesa transactions
    transactions = relationship(
        "MpesaTransaction",
        back_populates="contact",
        cascade="all, delete-orphan",
        order_by="desc(MpesaTransaction.created_at)"
    )

    @property
    def full_name(self) -> str:
        """Compose human-friendly full name from available components."""
        parts = [p for p in [self.first_name, self.middle_name, self.last_name] if p and p.strip()]
        return " ".join(parts) if parts else "Unknown Contact"

    def to_dict(self):
        """Serialize contact to dictionary."""
        return {
            "id": self.id,
            "first_name": self.first_name,
            "middle_name": self.middle_name or "",
            "last_name": self.last_name or "",
            "full_name": self.full_name,
            "phone_number": self.phone_number,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Contact(id={self.id}, name='{self.full_name}', phone='{self.phone_number}')>"


class MpesaTransaction(Base):
    """
    M-Pesa STK Push transaction record.
    Tracks requests, callbacks, receipt numbers, and status transitions.
    """
    __tablename__ = "mpesa_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=True, index=True)
    
    amount = Column(Numeric(10, 2), nullable=False)
    phone_number = Column(String(20), nullable=False, index=True)
    
    # Safaricom identifiers
    merchant_request_id = Column(String(100), index=True, nullable=False)
    checkout_request_id = Column(String(100), unique=True, index=True, nullable=False)
    receipt_number = Column(String(50), nullable=True, index=True)
    transaction_date = Column(DateTime, nullable=True)
    
    # Result information from Safaricom callback
    result_code = Column(Integer, nullable=True)
    result_description = Column(String(255), nullable=True)
    
    # Status: 'Pending', 'Successful', 'Failed', 'Cancelled'
    status = Column(String(20), default="Pending", index=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship back to Contact
    contact = relationship("Contact", back_populates="transactions")

    def to_dict(self):
        """Serialize transaction to dictionary."""
        return {
            "id": self.id,
            "contact_id": self.contact_id,
            "recipient_name": self.contact.full_name if self.contact else "Unknown Recipient",
            "amount": float(self.amount) if self.amount is not None else 0.0,
            "phone_number": self.phone_number,
            "merchant_request_id": self.merchant_request_id,
            "checkout_request_id": self.checkout_request_id,
            "receipt_number": self.receipt_number,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "result_code": self.result_code,
            "result_description": self.result_description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<MpesaTransaction(id={self.id}, checkout='{self.checkout_request_id}', status='{self.status}')>"


# Composite indexes for fast search and querying
Index("idx_contacts_name", Contact.first_name, Contact.last_name)
Index("idx_transactions_status_created", MpesaTransaction.status, MpesaTransaction.created_at)
