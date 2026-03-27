"""
Capture service — placeholder for real glasses / FFmpeg pipeline.

When a trigger phrase is detected the system calls
`trigger_glasses_capture()`.  For now it only logs; replace the body
with real hardware + FFmpeg calls later.
"""

from __future__ import annotations
from datetime import datetime


def trigger_glasses_capture(
    raw_text: str,
    matched_triggers: list[str],
    session_id: str | None = None,
) -> None:
    """Placeholder — fire the glasses capture and log the action.

    ---------------------------------------------------------------
    FUTURE WORK (replace this function body):
      1. Send a BLE / HTTP command to the Omi glasses to save the
         current rolling video buffer.
      2. Kick off an FFmpeg merge pipeline to combine the saved
         audio clip with the video buffer, e.g.:
             ffmpeg -i video_buffer.mp4 -i audio_clip.wav \
                    -c:v copy -c:a aac -strict experimental \
                    merged_output.mp4
      3. Upload / store the merged file and update the event record.
    ---------------------------------------------------------------
    """
    ts = datetime.utcnow().isoformat()
    print(
        f"[CAPTURE] {ts}  |  session={session_id}  |  "
        f"triggers={matched_triggers}  |  text={raw_text!r}"
    )
    print("[CAPTURE] >>> Placeholder: glasses capture + FFmpeg merge would run here <<<")
