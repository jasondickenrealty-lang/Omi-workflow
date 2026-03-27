"""
GET /health — liveness check.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "omi-trigger-system"}
