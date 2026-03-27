"""
POST /auth/login — authenticate and receive a JWT token.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.auth_service import authenticate_user, create_token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    if not authenticate_user(body.username, body.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(body.username)
    return LoginResponse(access_token=token)
