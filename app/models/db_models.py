"""
SQLAlchemy ORM models — the single source of truth for the database schema.

Tables:
  - events:   trigger / command events from the webhook pipeline
  - commands: log of voice commands executed
  - photos:   captured photo metadata
  - videos:   captured video metadata
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class EventRow(Base):
    """A trigger or command event captured from the transcript stream."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    session_id = Column(String(128), nullable=True)
    raw_text = Column(Text, nullable=False)
    matched_triggers = Column(Text, default="")
    command_executed = Column(String(128), nullable=True)
    capture_requested = Column(Boolean, default=False)
    source = Column(String(64), default="omi_glasses")
    notes = Column(Text, nullable=True)


class CommandLog(Base):
    """Dedicated log for voice commands."""
    __tablename__ = "commands"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    session_id = Column(String(128), nullable=True)
    command = Column(String(128), nullable=False)
    raw_text = Column(Text, nullable=False)
    result = Column(Text, nullable=True)


class PhotoRecord(Base):
    """Metadata for a captured photo."""
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    session_id = Column(String(128), nullable=True)
    file_path = Column(Text, nullable=False)
    thumbnail_path = Column(Text, nullable=True)
    uid = Column(String(128), nullable=True)
    source = Column(String(64), default="omi_glasses")
    tags = Column(Text, nullable=True)


class VideoRecord(Base):
    """Metadata for a captured video."""
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    session_id = Column(String(128), nullable=True)
    file_path = Column(Text, nullable=False)
    duration = Column(Float, nullable=True)
    uid = Column(String(128), nullable=True)
    source = Column(String(64), default="omi_glasses")
    tags = Column(Text, nullable=True)
