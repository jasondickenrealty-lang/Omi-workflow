"""
GET /events      — list all stored events
GET /events/{id} — single event by primary key
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.services.storage_service import get_all_events, get_event, get_all_commands

router = APIRouter()


@router.get("/")
async def list_events(session: AsyncSession = Depends(get_session)):
    """Return every recorded trigger event."""
    events = await get_all_events(session)
    return {"count": len(events), "events": events}


@router.get("/commands")
async def list_commands(session: AsyncSession = Depends(get_session)):
    """Return every recorded voice command."""
    commands = await get_all_commands(session)
    return {"count": len(commands), "commands": commands}


@router.get("/{event_id}")
async def read_event(event_id: int, session: AsyncSession = Depends(get_session)):
    """Return a single event by its primary key."""
    event = await get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
