"""
Media retention helpers.

Ensures total disk usage for stored photos/videos stays within configured limits
by deleting the oldest media records first.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.db_models import PhotoRecord, VideoRecord


@dataclass
class _MediaRow:
    kind: str
    id: int
    timestamp: object
    file_path: str
    thumbnail_path: str | None = None


def _file_size(path_str: str | None) -> int:
    if not path_str:
        return 0
    p = Path(path_str)
    if not p.exists() or not p.is_file():
        return 0
    try:
        return p.stat().st_size
    except OSError:
        return 0


def _safe_unlink(path_str: str | None) -> None:
    if not path_str:
        return
    p = Path(path_str)
    if not p.exists() or not p.is_file():
        return
    try:
        p.unlink()
    except OSError:
        return


async def enforce_media_storage_limit(
    db: AsyncSession,
    max_bytes: int | None = None,
) -> None:
    """Delete oldest media until total on-disk usage is <= max_bytes."""
    limit = max_bytes if max_bytes is not None else settings.max_media_storage_bytes
    if limit <= 0:
        return

    photos = (await db.execute(select(PhotoRecord))).scalars().all()
    videos = (await db.execute(select(VideoRecord))).scalars().all()

    media_rows: list[_MediaRow] = []
    total_bytes = 0

    for p in photos:
        total_bytes += _file_size(p.file_path)
        total_bytes += _file_size(p.thumbnail_path)
        media_rows.append(
            _MediaRow(
                kind="photo",
                id=p.id,
                timestamp=p.timestamp,
                file_path=p.file_path,
                thumbnail_path=p.thumbnail_path,
            )
        )

    for v in videos:
        total_bytes += _file_size(v.file_path)
        media_rows.append(
            _MediaRow(
                kind="video",
                id=v.id,
                timestamp=v.timestamp,
                file_path=v.file_path,
            )
        )

    if total_bytes <= limit:
        return

    media_rows.sort(key=lambda r: (r.timestamp is None, r.timestamp, r.id))

    for row in media_rows:
        if total_bytes <= limit:
            break

        if row.kind == "photo":
            db_row = await db.get(PhotoRecord, row.id)
            if not db_row:
                continue
            freed = _file_size(db_row.file_path) + _file_size(db_row.thumbnail_path)
            _safe_unlink(db_row.file_path)
            _safe_unlink(db_row.thumbnail_path)
            await db.delete(db_row)
            total_bytes = max(0, total_bytes - freed)
            continue

        db_row = await db.get(VideoRecord, row.id)
        if not db_row:
            continue
        freed = _file_size(db_row.file_path)
        _safe_unlink(db_row.file_path)
        await db.delete(db_row)
        total_bytes = max(0, total_bytes - freed)

    await db.commit()
