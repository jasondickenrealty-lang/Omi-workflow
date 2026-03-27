"""
Omi AI Glasses — Ice Cream Shop Platform
FastAPI backend: transcript webhooks, trigger detection, voice commands,
photo/video storage, JWT auth, and placeholder capture pipeline.

Run:  uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings
from app.database import init_db
from app.routes import webhook, events, health, auth, photos, videos


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print(f"[startup] Database initialised at {settings.db_path}")
    print(f"[startup] Omi Ice Cream Shop Platform running on port {settings.port}")
    yield
    print("[shutdown] Omi platform stopped")


app = FastAPI(
    title="Omi Ice Cream Shop Platform",
    version="0.3.0",
    description="Webhook-driven trigger detection, voice commands, and photo/video management for Omi AI glasses",
    lifespan=lifespan,
)

# --- Public routes (no auth) ---
app.include_router(health.router, tags=["Health"])
app.include_router(webhook.router, prefix="/webhook", tags=["Webhook"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])

# --- Protected routes (JWT required) ---
app.include_router(events.router, prefix="/events", tags=["Events"])
app.include_router(photos.router, prefix="/photos", tags=["Photos"])
app.include_router(videos.router, prefix="/videos", tags=["Videos"])
