"""
Video storage and retrieval.
"""

from __future__ import annotations
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.db_models import VideoRecord


def _videos_dir() -> Path:
    d = Path(settings.videos_dir) / datetime.utcnow().strftime("%Y-%m-%d")
    d.mkdir(parents=True, exist_ok=True)
    return d


async def save_video_from_bytes(
    db: AsyncSession,
    data: bytes,
    session_id: str | None = None,
    uid: str | None = None,
    source: str = "omi_glasses",
    duration: float | None = None,
    tags: str | None = None,
) -> VideoRecord:
    """Save raw video bytes to disk + DB."""
    day_dir = _videos_dir()
    filename = f"{datetime.utcnow().strftime('%H%M%S')}_{uuid4().hex[:8]}.mp4"
    file_path = day_dir / filename

    with open(file_path, "wb") as f:
        f.write(data)

    row = VideoRecord(
        session_id=session_id,
        file_path=str(file_path),
        duration=duration,
        uid=uid,
        source=source,
        tags=tags,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_videos(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """Return paginated video list + total count."""
    count = (await db.execute(select(func.count(VideoRecord.id)))).scalar() or 0

    offset = (page - 1) * limit
    query = select(VideoRecord).order_by(VideoRecord.id.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    videos = [_to_dict(r) for r in result.scalars().all()]

    return videos, count


async def get_video(db: AsyncSession, video_id: int) -> dict | None:
    row = await db.get(VideoRecord, video_id)
    return _to_dict(row) if row else None


async def delete_video(db: AsyncSession, video_id: int) -> bool:
    row = await db.get(VideoRecord, video_id)
    if not row:
        return False
    path = Path(row.file_path)
    if path.exists():
        path.unlink()
    await db.delete(row)
    await db.commit()
    return True


def _to_dict(row: VideoRecord) -> dict:
    return {
        "id": row.id,
        "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        "session_id": row.session_id,
        "duration": row.duration,
        "uid": row.uid,
        "source": row.source,
        "tags": row.tags,
    }
