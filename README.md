# Omi Workflow

![CI](https://github.com/jasondickenrealty-lang/Omi-workflow/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

FastAPI backend for the Omi AI glasses workflow: webhook ingestion, trigger detection, voice command storage, media handling, and JWT-authenticated access to protected routes.

## Features
- Webhook ingestion for transcript/event processing
- Trigger and command handling
- Async SQLite storage via SQLAlchemy
- JWT authentication for protected endpoints
- Photo and video route scaffolding
- Automatic media retention: caps total photo/video storage and deletes oldest media first

## Tech Stack
- Python
- FastAPI
- SQLAlchemy (async)
- SQLite (aiosqlite)
- Pydantic v2

## Project Structure
- `app/main.py` - FastAPI app setup and route registration
- `app/routes/` - API route handlers
- `app/services/` - business logic and storage helpers
- `app/models/` - Pydantic and DB models
- `app/data/` - local data and media folders

## Run Locally
1. Create and activate a Python virtual environment.
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start the app:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
   ```

4. Open docs:
- Swagger UI: `http://localhost:9000/docs`
- ReDoc: `http://localhost:9000/redoc`

## Docker
- Build and run with Docker or docker-compose using the included files:
- `Dockerfile`
- `docker-compose.yml`

## Prompt for AI Collaboration
A reusable coding prompt is included in `PROMPT.md`.

## License
MIT. See the LICENSE file.
