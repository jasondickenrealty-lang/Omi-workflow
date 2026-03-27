"""
Video endpoints — browse, view, stream, download, delete.
All protected by JWT auth.
"""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.middleware.auth_middleware import require_auth
from app.services.video_service import get_videos, get_video, delete_video

router = APIRouter()


@router.get("/")
async def list_videos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Paginated list of captured videos."""
    videos, total = await get_videos(db, page=page, limit=limit)
    return {"videos": videos, "total": total, "page": page, "limit": limit}


@router.get("/{video_id}")
async def read_video(
    video_id: int,
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Get metadata for a single video."""
    video = await get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.get("/{video_id}/file")
async def serve_video_file(
    video_id: int,
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Serve/stream the video file."""
    from app.models.db_models import VideoRecord
    row = await db.get(VideoRecord, video_id)
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    path = Path(row.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video file missing from disk")
    return FileResponse(str(path), media_type="video/mp4")


@router.delete("/{video_id}")
async def remove_video(
    video_id: int,
    db: AsyncSession = Depends(get_session),
    user: str = Depends(require_auth),
):
    """Delete a video (file + DB record)."""
    deleted = await delete_video(db, video_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"status": "deleted", "id": video_id}
