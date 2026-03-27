# Voice Commands Module + VPS-Ready Architecture

## Context
Jason is building an ice cream shop platform powered by Omi AI glasses + wearable. The trigger detection system (module 1) is done. Now we're adding **voice commands** (module 2) and restructuring for **VPS deployment** on his Linux server, since his Windows PC won't always be on. This is also the foundation for the future Android app, customer face recognition, inventory, and food photo modules.

## What changes

### 1. Voice Command System
New files:
- `app/services/command_service.py` — command registry + dispatcher
- `app/models/command_models.py` — Pydantic models for commands and responses

Modify:
- `app/routes/webhook.py` — after trigger detection, also run command detection; commands take priority over triggers
- `app/models/event_models.py` — add command fields to the event record

**Voice commands (initial set):**
| Command phrase | Action |
|---|---|
| "take a picture" / "take a photo" | Fire glasses camera capture |
| "new order" | Start logging a new customer order |
| "check inventory" | Read back current stock levels |
| "save this moment" | Same as trigger — capture video/audio |
| "stop recording" | End current capture session |

Command detection works identically to trigger detection — substring match on the transcript. Commands are prefixed-checked *before* triggers so "take a picture" doesn't accidentally match a trigger too.

### 2. Database Migration (SQLite)
New files:
- `app/database.py` — SQLAlchemy async engine + session setup
- `app/models/db_models.py` — SQLAlchemy ORM tables (events, commands, future: customers, orders, inventory)

Modify:
- `app/services/storage_service.py` — swap JSON file reads/writes for SQLite queries
- `requirements.txt` — add `aiosqlite`, `sqlalchemy[asyncio]`

The JSON file stays as a fallback but SQLite becomes primary. This is required for customer/order/inventory data and works perfectly on a VPS.

### 3. VPS Deployment Config
New files:
- `Dockerfile` — containerized FastAPI app
- `docker-compose.yml` — app + volume for SQLite DB persistence
- `.env.example` — env vars template (port, DB path, debug mode)
- `app/config.py` — settings loaded from environment variables via pydantic-settings

This lets Jason `docker compose up` on his VPS and it just runs.

### 4. Webhook Security
Modify:
- `app/routes/webhook.py` — add optional API key check via `X-API-Key` header
- `app/config.py` — API key loaded from env var

Since this will be internet-facing on the VPS, we need at minimum a shared secret so random people can't POST to the webhook.

## File-by-file summary

| File | Action | Purpose |
|---|---|---|
| `app/config.py` | **NEW** | Pydantic settings from env vars |
| `app/database.py` | **NEW** | SQLAlchemy async engine + session |
| `app/models/command_models.py` | **NEW** | Command Pydantic models |
| `app/models/db_models.py` | **NEW** | SQLAlchemy ORM tables |
| `app/services/command_service.py` | **NEW** | Command registry, detection, dispatch |
| `Dockerfile` | **NEW** | Container config |
| `docker-compose.yml` | **NEW** | Compose with volume mount |
| `.env.example` | **NEW** | Env var template |
| `app/main.py` | **EDIT** | Add DB startup, load config |
| `app/routes/webhook.py` | **EDIT** | Add command detection + API key auth |
| `app/models/event_models.py` | **EDIT** | Add command_executed field |
| `app/services/storage_service.py` | **EDIT** | Switch to SQLite backend |
| `requirements.txt` | **EDIT** | Add sqlalchemy, aiosqlite, pydantic-settings |

## Build order
1. `app/config.py` + `.env.example` — settings foundation
2. `app/database.py` + `app/models/db_models.py` — database layer
3. `app/services/storage_service.py` — migrate to SQLite
4. `app/models/command_models.py` + `app/services/command_service.py` — voice command engine
5. `app/routes/webhook.py` + `app/models/event_models.py` — wire commands into webhook
6. `app/main.py` — DB init on startup, config loading
7. `Dockerfile` + `docker-compose.yml` — VPS deployment
8. Test everything locally, then deploy to VPS

## Verification
1. `uvicorn app.main:app --port 9000` starts without errors
2. `curl POST /webhook/transcript` with trigger phrase → event saved to SQLite, capture logged
3. `curl POST /webhook/transcript` with "take a picture" → command detected, action dispatched
4. `curl GET /events/` → returns events from SQLite
5. `curl GET /health` → ok
6. `docker compose up` → runs on VPS
7. Omi webhook pointed at `http://<vps-ip>:9000/webhook/transcript` → end-to-end test
