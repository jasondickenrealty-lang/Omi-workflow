"""
Webhook endpoints matching Omi's actual payload formats.

POST /webhook/transcript?session_id=x&uid=x  — real-time transcript segments
POST /webhook/memory?uid=x                   — completed memory/conversation
POST /webhook/simple                         — manual test with plain text
"""

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.event_models import (
    TranscriptSegment, MemoryPayload, SimpleWebhookPayload, WebhookResponse,
)
from app.services.trigger_detection import detect_triggers
from app.services.capture_service import trigger_glasses_capture
from app.services.command_service import detect_command, execute_command
from app.services.storage_service import save_event, save_command
from app.services.photo_service import save_photo_from_bytes

router = APIRouter()


async def _process_text(
    raw_text: str,
    session_id: str | None,
    source: str,
    db: AsyncSession,
) -> WebhookResponse:
    """Shared logic: detect commands/triggers, save event, fire capture."""

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Empty transcript text")

    command_name = None
    command_result = None
    matched_triggers: list[str] = []
    capture_requested = False

    # 1. Commands first
    command_name = detect_command(raw_text)
    if command_name:
        command_result = execute_command(command_name, raw_text, session_id)
        capture_requested = command_name in ("take_photo", "save_moment")
        await save_command(db, {
            "session_id": session_id,
            "command": command_name,
            "raw_text": raw_text,
            "result": command_result.message,
        })
    else:
        # 2. Triggers
        matched_triggers = detect_triggers(raw_text)
        capture_requested = len(matched_triggers) > 0

    # 3. Notes
    if command_name:
        notes = f"Command: {command_name} — {command_result.message}"
    elif matched_triggers:
        notes = f"Matched {len(matched_triggers)} trigger(s)"
    else:
        notes = "No triggers or commands matched"

    # 4. Save event
    event_id = await save_event(db, {
        "session_id": session_id,
        "raw_text": raw_text,
        "matched_triggers": matched_triggers,
        "command_executed": command_name,
        "capture_requested": capture_requested,
        "source": source,
        "notes": notes,
    })

    # 5. Fire capture for trigger matches
    if not command_name and capture_requested:
        trigger_glasses_capture(raw_text, matched_triggers, session_id)

    return WebhookResponse(
        status="command" if command_name else ("triggered" if capture_requested else "received"),
        triggers_found=matched_triggers,
        command_executed=command_name,
        capture_requested=capture_requested,
        event_id=event_id,
    )


# ── Omi real-time transcript webhook ─────────────────

@router.post("/transcript", response_model=WebhookResponse)
async def receive_transcript(
    request: Request,
    session_id: str | None = Query(default=None),
    uid: str | None = Query(default=None),
    db: AsyncSession = Depends(get_session),
):
    """Receive real-time transcript segments from Omi.

    Omi sends: POST /webhook/transcript?session_id=abc&uid=user123
    Body: [{"text": "...", "speaker": "SPEAKER_00", ...}, ...]
    """
    body = await request.json()
    segments = [TranscriptSegment(**seg) for seg in body]
    raw_text = " ".join(seg.text for seg in segments if seg.text)
    sid = session_id or uid or "unknown"
    return await _process_text(raw_text, sid, "omi_realtime", db)


# ── Omi memory creation webhook ──────────────────────

@router.post("/memory", response_model=WebhookResponse)
async def receive_memory(
    memory: MemoryPayload,
    uid: str | None = Query(default=None),
    db: AsyncSession = Depends(get_session),
):
    """Receive a completed memory/conversation from Omi.

    Omi sends: POST /webhook/memory?uid=user123
    Body: {"id": "...", "transcript_segments": [...], "structured": {...}, ...}
    """
    raw_text = memory.full_text()
    sid = memory.id or uid or "unknown"
    return await _process_text(raw_text, sid, "omi_memory", db)


# ── Simple test endpoint (backward-compatible) ───────

@router.post("/simple", response_model=WebhookResponse)
async def receive_simple(
    payload: SimpleWebhookPayload,
    db: AsyncSession = Depends(get_session),
):
    """Simple test endpoint — send plain text for testing."""
    raw_text = payload.resolve_text()
    return await _process_text(raw_text, payload.session_id, payload.source or "manual", db)


# ── Photo ingestion (from glasses over WiFi) ─────────

@router.post("/photo")
async def receive_photo(
    file: UploadFile = File(...),
    session_id: str | None = Query(default=None),
    uid: str | None = Query(default=None),
    db: AsyncSession = Depends(get_session),
):
    """Receive a photo from the glasses. Saves to disk + generates thumbnail."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    photo = await save_photo_from_bytes(
        db, data, session_id=session_id, uid=uid, source="omi_glasses",
    )
    return {"status": "saved", "photo_id": photo.id}
