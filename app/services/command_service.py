"""
Voice command detection and dispatch.

Each command maps a set of spoken phrases to a handler function.
Detection runs BEFORE trigger detection so that "take a picture"
is treated as a command, not a trigger.

To add a new command:
  1. Write a handler function  _handle_xxx(raw_text, session_id) -> CommandResult
  2. Add an entry to COMMANDS with the phrases that activate it.
"""

from __future__ import annotations
from datetime import datetime
from app.models.command_models import CommandResult


# ── Command registry ──────────────────────────────
# Each key is the canonical command name.
# "phrases" are the spoken variants that activate it.

COMMANDS: dict[str, dict] = {
    "take_photo": {
        "phrases": ["take a picture", "take a photo", "snap a pic", "capture this"],
        "description": "Capture a photo from the glasses camera",
    },
    "new_order": {
        "phrases": ["new order", "start order", "ring up"],
        "description": "Begin logging a new customer order",
    },
    "check_inventory": {
        "phrases": ["check inventory", "stock check", "what do we have"],
        "description": "Read back current stock levels",
    },
    "save_moment": {
        "phrases": ["save this moment", "save this", "bookmark this"],
        "description": "Capture and save the current video/audio buffer",
    },
    "stop_recording": {
        "phrases": ["stop recording", "end capture", "stop capture"],
        "description": "End the current capture session",
    },
}


def detect_command(text: str) -> str | None:
    """Return the first matching command name, or None.

    Call this BEFORE detect_triggers() — if a command matches,
    skip trigger detection for this transcript.
    """
    lowered = text.lower()
    for cmd_name, cmd_info in COMMANDS.items():
        for phrase in cmd_info["phrases"]:
            if phrase in lowered:
                return cmd_name
    return None


def execute_command(command_name: str, raw_text: str, session_id: str | None = None) -> CommandResult:
    """Dispatch to the appropriate handler and return the result."""
    handler = _HANDLERS.get(command_name, _handle_unknown)
    return handler(raw_text, session_id)


# ── Handlers (placeholders — replace with real logic) ─────

def _handle_take_photo(raw_text: str, session_id: str | None) -> CommandResult:
    """Placeholder: trigger the glasses camera."""
    ts = datetime.utcnow().isoformat()
    print(f"[CMD:take_photo] {ts}  |  session={session_id}")
    print("[CMD:take_photo] >>> Placeholder: glasses camera shutter would fire here <<<")
    # FUTURE: send BLE/HTTP command to Omi glasses
    return CommandResult(
        command="take_photo",
        action="capture_photo",
        success=True,
        message="Photo capture requested (placeholder)",
    )


def _handle_new_order(raw_text: str, session_id: str | None) -> CommandResult:
    ts = datetime.utcnow().isoformat()
    print(f"[CMD:new_order] {ts}  |  session={session_id}")
    print("[CMD:new_order] >>> Placeholder: order entry would start here <<<")
    # FUTURE: create an Order row, begin voice-driven item entry
    return CommandResult(
        command="new_order",
        action="start_order",
        success=True,
        message="New order started (placeholder)",
    )


def _handle_check_inventory(raw_text: str, session_id: str | None) -> CommandResult:
    ts = datetime.utcnow().isoformat()
    print(f"[CMD:check_inventory] {ts}  |  session={session_id}")
    print("[CMD:check_inventory] >>> Placeholder: inventory readback would happen here <<<")
    # FUTURE: query inventory table, format as speech or push notification
    return CommandResult(
        command="check_inventory",
        action="read_inventory",
        success=True,
        message="Inventory check requested (placeholder)",
    )


def _handle_save_moment(raw_text: str, session_id: str | None) -> CommandResult:
    ts = datetime.utcnow().isoformat()
    print(f"[CMD:save_moment] {ts}  |  session={session_id}")
    print("[CMD:save_moment] >>> Placeholder: video/audio buffer save would fire here <<<")
    # FUTURE: save rolling buffer + FFmpeg merge
    return CommandResult(
        command="save_moment",
        action="save_buffer",
        success=True,
        message="Moment saved (placeholder)",
    )


def _handle_stop_recording(raw_text: str, session_id: str | None) -> CommandResult:
    ts = datetime.utcnow().isoformat()
    print(f"[CMD:stop_recording] {ts}  |  session={session_id}")
    print("[CMD:stop_recording] >>> Placeholder: capture session would end here <<<")
    return CommandResult(
        command="stop_recording",
        action="end_capture",
        success=True,
        message="Recording stopped (placeholder)",
    )


def _handle_unknown(raw_text: str, session_id: str | None) -> CommandResult:
    return CommandResult(
        command="unknown",
        action="none",
        success=False,
        message="Unrecognised command",
    )


# Maps command names → handler functions
_HANDLERS = {
    "take_photo": _handle_take_photo,
    "new_order": _handle_new_order,
    "check_inventory": _handle_check_inventory,
    "save_moment": _handle_save_moment,
    "stop_recording": _handle_stop_recording,
}
