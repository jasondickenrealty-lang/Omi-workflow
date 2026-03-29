"""
Application settings loaded from environment variables.

Copy .env.example to .env and fill in your values, or export them directly.
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Server ---
    app_name: str = "Omi Trigger System"
    debug: bool = False
    port: int = 9000

    # --- Database ---
    db_path: str = str(Path(__file__).resolve().parent / "data" / "omi.db")

    # --- Auth (for Android app login) ---
    admin_username: str = "jason"
    admin_password_hash: str = ""  # bcrypt hash — generate with: python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('yourpassword'))"
    jwt_secret: str = "change-me-to-a-random-string"

    # --- Storage ---
    photos_dir: str = str(Path(__file__).resolve().parent / "data" / "photos")
    videos_dir: str = str(Path(__file__).resolve().parent / "data" / "videos")
    max_media_storage_bytes: int = 5 * 1024 * 1024 * 1024

    # --- Omi Hardware (placeholders for future modules) ---
    omi_glasses_ip: str = ""
    omi_wearable_id: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
