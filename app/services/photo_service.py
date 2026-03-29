"""
Photo storage, thumbnail generation, and retrieval.
"""

from __future__ import annotations
import base64
import shutil
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from PIL import Image
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.media_retention_service import enforce_media_storage_limit
from app.models.db_models import PhotoRecord

THUMB_SIZE = (200, 200)


def _photos_dir() -> Path:
    return Path(settings.photos_dir)


def _today_dir() -> Path:
    """Return photos dir organized by date: photos/YYYY-MM-DD/"""
    d = _photos_dir() / datetime.utcnow().strftime("%Y-%m-%d")
    d.mkdir(parents=True, exist_ok=True)
    return d


def _save_thumbnail(src_path: Path) -> Path:
    """Generate a thumbnail and return its path."""
    thumb_path = src_path.parent / f"thumb_{src_path.name}"
    with Image.open(src_path) as img:
        img.thumbnail(THUMB_SIZE)
        img.save(thumb_path, "JPEG", quality=75)
    return thumb_path


async def save_photo_from_bytes(
    db: AsyncSession,
    data: bytes,
    session_id: str | None = None,
    uid: str | None = None,
    source: str = "omi_glasses",
    tags: str | None = None,
) -> PhotoRecord:
    """Save raw image bytes to disk + DB, generate thumbnail."""
    day_dir = _today_dir()
    filename = f"{datetime.utcnow().strftime('%H%M%S')}_{uuid4().hex[:8]}.jpg"
    file_path = day_dir / filename

    with open(file_path, "wb") as f:
        f.write(data)

    thumb_path = _save_thumbnail(file_path)

    row = PhotoRecord(
        session_id=session_id,
        file_path=str(file_path),
        thumbnail_path=str(thumb_path),
        uid=uid,
        source=source,
        tags=tags,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await enforce_media_storage_limit(db)
    return row


async def save_photo_from_base64(
    db: AsyncSession,
    b64_data: str,
    **kwargs,
) -> PhotoRecord:
    """Decode base64 image and save."""
    data = base64.b64decode(b64_data)
    return await save_photo_from_bytes(db, data, **kwargs)


async def get_photos(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    date: str | None = None,
) -> tuple[list[dict], int]:
    """Return paginated photo list + total count."""
    query = select(PhotoRecord).order_by(PhotoRecord.id.desc())

    if date:
        query = query.where(
            func.date(PhotoRecord.timestamp) == date
        )

    # Count
    count_q = select(func.count(PhotoRecord.id))
    if date:
        count_q = count_q.where(func.date(PhotoRecord.timestamp) == date)
    total = (await db.execute(count_q)).scalar() or 0

    # Page
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    photos = [_to_dict(r) for r in result.scalars().all()]

    return photos, total


async def get_photo(db: AsyncSession, photo_id: int) -> dict | None:
    row = await db.get(PhotoRecord, photo_id)
    return _to_dict(row) if row else None


async def delete_photo(db: AsyncSession, photo_id: int) -> bool:
    row = await db.get(PhotoRecord, photo_id)
    if not row:
        return False
    # Delete files from disk
    for p in [row.file_path, row.thumbnail_path]:
        if p:
            path = Path(p)
            if path.exists():
                path.unlink()
    await db.delete(row)
    await db.commit()
    return True


def _to_dict(row: PhotoRecord) -> dict:
    return {
        "id": row.id,
        "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        "session_id": row.session_id,
        "uid": row.uid,
        "source": row.source,
        "tags": row.tags,
    }
