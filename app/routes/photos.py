"""
Photo endpoints — browse, view, download, delete.
All protected by JWT auth.
"""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.middleware.auth_middleware import require_auth
from app.services.photo_service import get_photos, get_photo, delete_photo

router = APIRouter()


@router.get("/")
async def list_photos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    date: str | None = Query(default=None, description="Filter by date YYYY-MM-DD"),
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Paginated list of captured photos."""
    photos, total = await get_photos(db, page=page, limit=limit, date=date)
    return {"photos": photos, "total": total, "page": page, "limit": limit}


@router.get("/{photo_id}")
async def read_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Get metadata for a single photo."""
    photo = await get_photo(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


@router.get("/{photo_id}/file")
async def serve_photo_file(
    photo_id: int,
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Serve the full-size photo file."""
    photo = await get_photo(db, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    # Get the file path from DB row directly
    from app.models.db_models import PhotoRecord
    row = await db.get(PhotoRecord, photo_id)
    path = Path(row.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Photo file missing from disk")
    return FileResponse(str(path), media_type="image/jpeg")


@router.get("/{photo_id}/thumb")
async def serve_thumbnail(
    photo_id: int,
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Serve the thumbnail version."""
    from app.models.db_models import PhotoRecord
    row = await db.get(PhotoRecord, photo_id)
    if not row or not row.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    path = Path(row.thumbnail_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail file missing from disk")
    return FileResponse(str(path), media_type="image/jpeg")


@router.delete("/{photo_id}")
async def remove_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Delete a photo (file + DB record)."""
    deleted = await delete_photo(db, photo_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"status": "deleted", "id": photo_id}
