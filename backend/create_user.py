"""CLI utility script to create or update user accounts for ContactPay."""
import sys
import getpass
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

try:
    from database import get_db, init_db
    from model import User
except ImportError:
    from backend.database import get_db, init_db
    from backend.model import User


def create_or_update_user(username: str, password: str):
    """Create a new user or update password if the user already exists."""
    username = username.strip()
    if not username:
        print("Error: Username cannot be empty.")
        sys.exit(1)

    if not password:
        print("Error: Password cannot be empty.")
        sys.exit(1)

    if len(password) < 6:
        print("Error: Password must be at least 6 characters long.")
        sys.exit(1)

    # Ensure tables exist
    init_db()

    with get_db() as session:
        user = session.query(User).filter_by(username=username).first()
        if user:
            user.set_password(password)
            print(f"Password updated successfully for existing user '{username}'.")
        else:
            user = User(username=username)
            user.set_password(password)
            session.add(user)
            print(f"User '{username}' created successfully.")


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        user_arg = sys.argv[1]
        pwd_arg = sys.argv[2]
    elif len(sys.argv) == 2:
        user_arg = sys.argv[1]
        pwd_arg = getpass.getpass("Enter password: ")
    else:
        user_arg = input("Enter username: ")
        pwd_arg = getpass.getpass("Enter password: ")

    create_or_update_user(user_arg, pwd_arg)
