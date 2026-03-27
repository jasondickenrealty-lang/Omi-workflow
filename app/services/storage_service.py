"""
Storage service — persists events and commands to SQLite.

All public functions accept an AsyncSession so they can participate
in the caller's transaction.
"""

from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.db_models import EventRow, CommandLog


# ── Events ────────────────────────────────────────

async def save_event(session: AsyncSession, event: dict) -> int:
    """Insert an event row and return its id."""
    row = EventRow(
        session_id=event.get("session_id"),
        raw_text=event["raw_text"],
        matched_triggers=",".join(event.get("matched_triggers", [])),
        command_executed=event.get("command_executed"),
        capture_requested=event.get("capture_requested", False),
        source=event.get("source", "omi_glasses"),
        notes=event.get("notes"),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row.id


async def get_all_events(session: AsyncSession) -> list[dict]:
    """Return every stored event as a list of dicts."""
    result = await session.execute(select(EventRow).order_by(EventRow.id))
    return [_event_to_dict(r) for r in result.scalars().all()]


async def get_event(session: AsyncSession, event_id: int) -> dict | None:
    """Return a single event by its primary key, or None."""
    row = await session.get(EventRow, event_id)
    return _event_to_dict(row) if row else None


def _event_to_dict(row: EventRow) -> dict:
    return {
        "id": row.id,
        "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        "session_id": row.session_id,
        "raw_text": row.raw_text,
        "matched_triggers": row.matched_triggers.split(",") if row.matched_triggers else [],
        "command_executed": row.command_executed,
        "capture_requested": row.capture_requested,
        "source": row.source,
        "notes": row.notes,
    }


# ── Commands ──────────────────────────────────────

async def save_command(session: AsyncSession, command: dict) -> int:
    """Insert a command log row and return its id."""
    row = CommandLog(
        session_id=command.get("session_id"),
        command=command["command"],
        raw_text=command["raw_text"],
        result=command.get("result"),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row.id


async def get_all_commands(session: AsyncSession) -> list[dict]:
    """Return every stored command as a list of dicts."""
    result = await session.execute(select(CommandLog).order_by(CommandLog.id))
    return [_command_to_dict(r) for r in result.scalars().all()]


def _command_to_dict(row: CommandLog) -> dict:
    return {
        "id": row.id,
        "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        "session_id": row.session_id,
        "command": row.command,
        "raw_text": row.raw_text,
        "result": row.result,
    }
