"""
Pydantic models matching Omi's actual webhook payloads.

Omi sends two webhook types:
  1. Real-time transcript segments → POST /webhook/transcript?session_id=x&uid=x
  2. Memory creation             → POST /webhook/memory?uid=x
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


# ── Real-time transcript (array of segments) ──────

class TranscriptSegment(BaseModel):
    """A single transcript segment as sent by Omi in real-time."""
    text: str = ""
    speaker: Optional[str] = None
    speakerId: Optional[int] = None
    speaker_name: Optional[str] = None
    is_user: bool = False
    start: Optional[float] = None
    end: Optional[float] = None


# ── Memory creation payload ───────────────────────

class ActionItem(BaseModel):
    description: str = ""
    completed: bool = False


class StructuredMemory(BaseModel):
    title: Optional[str] = None
    overview: Optional[str] = None
    emoji: Optional[str] = None
    category: Optional[str] = None
    action_items: list[ActionItem] = []
    events: list = []


class MemoryPayload(BaseModel):
    """Full memory object sent by Omi when a conversation completes."""
    id: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    transcript_segments: list[TranscriptSegment] = []
    structured: Optional[StructuredMemory] = None
    apps_response: list = []
    discarded: bool = False

    def full_text(self) -> str:
        """Combine all segment text into a single string."""
        return " ".join(seg.text for seg in self.transcript_segments if seg.text)


# ── Backward-compatible simple payload (for manual/test use) ──

class SimpleWebhookPayload(BaseModel):
    """Simple payload for testing — send text directly."""
    text: Optional[str] = None
    transcript: Optional[str] = None
    message: Optional[str] = None
    session_id: Optional[str] = None
    source: Optional[str] = "manual"

    def resolve_text(self) -> str:
        return self.text or self.transcript or self.message or ""


# ── Response models ───────────────────────────────

class WebhookResponse(BaseModel):
    """Standard response after processing a webhook."""
    status: str
    triggers_found: list[str] = []
    command_executed: Optional[str] = None
    capture_requested: bool = False
    event_id: int
