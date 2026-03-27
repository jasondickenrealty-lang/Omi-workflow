"""
Trigger-phrase detection service.

Scans incoming transcript text for any of the configured trigger phrases
and returns the list of matches.
"""

# -- Trigger phrases (case-insensitive matching) --
TRIGGER_PHRASES: list[str] = [
    "this is amazing",
    "so good",
    "wow",
    "birthday party",
    "best ice cream",
    "oh my god",
    "i love this",
    "this is the best",
]


def detect_triggers(text: str) -> list[str]:
    """Return all trigger phrases found inside *text*."""
    lowered = text.lower()
    return [phrase for phrase in TRIGGER_PHRASES if phrase in lowered]
