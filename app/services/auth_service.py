"""
JWT authentication service.

Single-user auth — username and password hash are stored in .env.
Tokens expire after 24 hours by default.
"""

from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
from app.config import settings

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def authenticate_user(username: str, password: str) -> bool:
    """Check credentials against .env values."""
    if username != settings.admin_username:
        return False
    if not settings.admin_password_hash:
        return False
    return verify_password(password, settings.admin_password_hash)


def create_token(username: str) -> str:
    """Generate a JWT token."""
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    """Decode a JWT token and return the username, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
