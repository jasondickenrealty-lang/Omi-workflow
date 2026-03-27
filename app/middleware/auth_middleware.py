"""
JWT auth dependency for protected routes.

Usage in any route:
    @router.get("/protected")
    async def my_route(user: str = Depends(require_auth)):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.services.auth_service import decode_token

bearer_scheme = HTTPBearer()


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Validate JWT and return the username. Raises 401 if invalid."""
    username = decode_token(credentials.credentials)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return username
