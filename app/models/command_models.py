"""
Pydantic models for the voice command system.
"""

from pydantic import BaseModel


class CommandResult(BaseModel):
    """Returned by a command handler after execution."""
    command: str
    action: str
    success: bool
    message: str
