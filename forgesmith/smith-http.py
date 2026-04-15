#!/usr/bin/env python3
"""
ForgeSmith HTTP Gateway — Hermes-Powered App Assistant

FastAPI server bridging the ForgeSmith web UI to Hermes with full
session persistence, WebSocket streaming, file upload, and memory.

Token == User identity. SHA256 hash of the access token is the session key.
Conversations survive process restarts via SessionDB + JSON transcripts.

Endpoints:
  WS   /ws          — WebSocket for real-time chat (preferred)
  POST /chat        — SSE fallback for legacy HTML UI
  POST /upload      — File upload (documents, images)
  GET  /health      — Health check
  GET  /history     — Load conversation history

Auth: Bearer token via header or query param, validated against
      FORGESMITH_ACCESS_TOKEN env var.
"""

import asyncio
import hashlib
import json
import os
import sys
import threading
import time
import urllib.request
import uuid
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

# ── Add Hermes to path ──
HERMES_DIR = os.environ.get("HERMES_DIR", "/opt/hermes")
sys.path.insert(0, HERMES_DIR)

from run_agent import AIAgent  # noqa: E402
from hermes_state import SessionDB  # noqa: E402

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="[forgesmith] %(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("forgesmith")

# ── Late imports (FastAPI may not be available during linting) ──
try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile
    from fastapi import File as FileParam
    from fastapi import Header, Query, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse, StreamingResponse
except ImportError:
    log.error("FastAPI not installed. Run: pip install fastapi 'uvicorn[standard]' python-multipart")
    sys.exit(1)

# ── Config ──
PORT = int(os.environ.get("SMITH_HTTP_PORT", "8585"))
ACCESS_TOKEN = os.environ.get("FORGESMITH_ACCESS_TOKEN", "")
FORGE_FACTORY_URL = os.environ.get("FORGE_FACTORY_URL", "")
FORGE_USER_TOKEN = os.environ.get("FORGE_USER_TOKEN", "")
HERMES_HOME = os.environ.get("HERMES_HOME", "/data/hermes")
MAX_ITERATIONS = int(os.environ.get("FORGESMITH_MAX_TURNS", "30"))

# Model split: Opus for planning/conversation, Sonnet for code execution
# FORGE_SMITH_* → FORGESMITH_* → defaults (backward compat)
PLANNING_MODEL = os.environ.get(
    "FORGE_SMITH_REASONING_MODEL",
    os.environ.get("FORGESMITH_PLANNING_MODEL",
        os.environ.get("FORGESMITH_MODEL", "anthropic/claude-opus-4-20250514")),
)
EXECUTION_MODEL = os.environ.get(
    "FORGE_SMITH_EXECUTION_MODEL",
    os.environ.get("FORGESMITH_EXECUTION_MODEL", "anthropic/claude-opus-4-20250514"),
)
PLANNING_PROVIDER = os.environ.get(
    "FORGE_SMITH_REASONING_PROVIDER",
    os.environ.get("FORGESMITH_PLANNING_PROVIDER",
        os.environ.get("FORGESMITH_PROVIDER", "anthropic")),
)
PLANNING_BASE_URL = os.environ.get(
    "FORGESMITH_BASE_URL",
    os.environ.get("FORGE_BASE_URL", "https://api.anthropic.com"),
)
# API key: explicit smith key → provider-specific key → generic FORGE_API_KEY.
# Prevents FORGE_API_KEY (e.g. MiMo key) from overriding ANTHROPIC_API_KEY
# when the provider is explicitly "anthropic".
_PROVIDER_KEY_VARS = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY", "openrouter": "OPENROUTER_API_KEY"}
PLANNING_API_KEY = (
    os.environ.get("FORGESMITH_API_KEY")
    or os.environ.get(_PROVIDER_KEY_VARS.get(PLANNING_PROVIDER, ""), "")
    or os.environ.get("FORGE_API_KEY", "")
)

# ── Persistence paths ──
SESSIONS_DIR = Path(HERMES_HOME) / "sessions" / "smith"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR = Path(HERMES_HOME) / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path(HERMES_HOME) / "state.db"

# ── Session DB ──
_session_db = SessionDB(db_path=DB_PATH)


# ═══════════════════════════════════════════════════════════════════════
# Identity: Token == User
# ═══════════════════════════════════════════════════════════════════════

def _token_hash(token: str) -> str:
    """Derive a stable 16-char hex ID from the access token."""
    return hashlib.sha256(token.encode()).hexdigest()[:16]


def _validate_remote(token: str) -> bool:
    """Check token against forge-factory /auth/validate. Returns True if valid."""
    try:
        url = f"{FORGE_FACTORY_URL}/auth/validate?token={token}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return bool(data.get("valid"))
    except Exception as e:
        log.warning(f"Remote token validation failed: {e}")
        return False


def _verify_token(token: Optional[str]) -> Optional[str]:
    """Return the token if valid, None otherwise.

    Validation order:
    1. If FORGE_FACTORY_URL + FORGE_USER_TOKEN are set → remote validation
       against forge-factory (single token for entire user journey).
       Falls back to local check if remote is unreachable.
    2. Local FORGESMITH_ACCESS_TOKEN check (backwards compat).
    3. Open mode (no auth configured).
    """
    if not token:
        if not ACCESS_TOKEN and not FORGE_USER_TOKEN:
            return "dev-token"
        return None

    # Remote validation mode: forge-factory is the auth authority
    if FORGE_FACTORY_URL and FORGE_USER_TOKEN:
        if _validate_remote(token):
            return token
        # Fall back to local check if remote unreachable
        if ACCESS_TOKEN and token == ACCESS_TOKEN:
            return token
        return None

    # Local token check (backwards compat)
    if ACCESS_TOKEN:
        if token == ACCESS_TOKEN:
            return token
        return None

    # Open mode
    return token


# ═══════════════════════════════════════════════════════════════════════
# Context Compaction
# ═══════════════════════════════════════════════════════════════════════

import re as _re

# How many recent turns to keep raw when compacting.
_RAW_TURNS_TO_KEEP = 6
# Start compacting after this many turns (before this, full history is passed).
_COMPACTION_START_TURN = 6


class ContextManager:
    """Extractive context compaction for long ForgeSmith sessions.

    Maintains a rolling summary of key signals (files modified, decisions,
    errors) and returns compact context: [summary] + [last N raw turns].
    No LLM calls, no external API cost.
    """

    def __init__(self):
        self._turn_count: int = 0
        self._original_task: str = ""
        self._files_modified: List[str] = []
        self._decisions: List[str] = []
        self._errors_fixed: List[str] = []
        self._operations: List[str] = []

    def record_turn(self, user_msg: str, assistant_msg: str):
        """Extract signals from the turn and update counters."""
        self._turn_count += 1

        # Capture original task from first user message
        if self._turn_count == 1 and not self._original_task:
            self._original_task = user_msg[:500]

        turn = self._turn_count

        # Extract file operations from tool call patterns
        for m in _re.finditer(
            r'(?:write_file|patch)\(["\']([^"\']+)["\']', assistant_msg
        ):
            path = m.group(1)
            entry = f"- Modified {path} (turn {turn})"
            if entry not in self._files_modified:
                self._files_modified.append(entry)

        # Extract git commits
        for m in _re.finditer(
            r'(?:git commit[^"\n]*-m\s*["\']([^"\']+)["\']|Committed:\s*(.+))',
            assistant_msg,
        ):
            msg = m.group(1) or m.group(2)
            if msg:
                entry = f"- Committed: {msg.strip()[:80]} (turn {turn})"
                if entry not in self._decisions:
                    self._decisions.append(entry)

        # Extract test runs
        if _re.search(
            r'(?:npm\s+(?:run\s+)?test|pytest|make\s+test)', assistant_msg
        ):
            entry = f"- Ran tests (turn {turn})"
            if entry not in self._operations:
                self._operations.append(entry)

        # Extract deployment/build
        if _re.search(
            r'(?:docker\s+build|fly\s+deploy|npm\s+run\s+build)', assistant_msg
        ):
            entry = f"- Built/deployed (turn {turn})"
            if entry not in self._operations:
                self._operations.append(entry)

        # Extract errors encountered
        for m in _re.finditer(
            r'(?:Error|error|ERROR)[\s:]+([^\n]{10,80})', assistant_msg
        ):
            err = m.group(1).strip()
            entry = f"- Error: {err[:60]} (turn {turn})"
            if entry not in self._errors_fixed:
                self._errors_fixed.append(entry)

    def get_context(self, full_history: list) -> list:
        """Return compact context for the API.

        Before compaction threshold: returns full history unchanged.
        After: returns [summary message] + [last N raw turns].
        """
        if self._turn_count < _COMPACTION_START_TURN:
            return list(full_history)

        # Build rolling summary
        summary = self._build_summary()
        summary_msg = {"role": "user", "content": summary}

        # Keep last N raw exchanges (user + assistant pairs)
        raw_count = min(_RAW_TURNS_TO_KEEP * 2, len(full_history))
        recent = full_history[-raw_count:] if raw_count > 0 else []

        return [summary_msg] + recent

    def _build_summary(self) -> str:
        parts = [f"[SESSION CONTEXT \u2014 Turn {self._turn_count}]"]

        if self._original_task:
            parts.append(f"\n## Original Task\n{self._original_task}")

        # Deduplicate while preserving order
        completed = []
        seen = set()
        for item in self._files_modified + self._operations:
            if item not in seen:
                seen.add(item)
                completed.append(item)
        if completed:
            parts.append("\n## Work Completed")
            parts.extend(completed)

        if self._decisions:
            parts.append("\n## Key Decisions")
            parts.extend(self._decisions)

        if self._errors_fixed:
            parts.append("\n## Errors Addressed")
            parts.extend(self._errors_fixed[-5:])

        parts.append(
            "\n## Note\n"
            "The above is a summary of earlier work. Recent turns below "
            "contain the full detail. Use session_search if you need to "
            "recall specific past tool outputs."
        )
        return "\n".join(parts)

    def to_dict(self) -> dict:
        return {
            "turn_count": self._turn_count,
            "original_task": self._original_task,
            "files_modified": self._files_modified,
            "decisions": self._decisions,
            "errors_fixed": self._errors_fixed,
            "operations": self._operations,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ContextManager":
        mgr = cls()
        mgr._turn_count = data.get("turn_count", 0)
        mgr._original_task = data.get("original_task", "")
        mgr._files_modified = data.get("files_modified", [])
        mgr._decisions = data.get("decisions", [])
        mgr._errors_fixed = data.get("errors_fixed", [])
        mgr._operations = data.get("operations", [])
        return mgr


# ═══════════════════════════════════════════════════════════════════════
# Session Persistence
# ═══════════════════════════════════════════════════════════════════════

class SmithSession:
    """Persistent conversation state for a single user (token).

    Stores history in:
    - JSON file on /data volume (fast load on restart)
    - SessionDB SQLite (enables session_search tool)
    """

    def __init__(self, user_id: str, db: SessionDB):
        self.user_id = user_id
        self.session_key = f"agent:main:smith:dm:{user_id}"
        self._db = db
        self._lock = threading.Lock()
        self._history: list = []
        self._session_id: str = ""
        self._context_mgr = ContextManager()
        self._path = SESSIONS_DIR / f"{user_id}.json"
        self._load()

    def _load(self):
        if self._path.exists():
            try:
                data = json.loads(self._path.read_text())
                self._history = data.get("history", [])
                self._session_id = data.get("session_id", "")
                # Restore context manager state if present
                cm_data = data.get("context_mgr")
                if cm_data:
                    self._context_mgr = ContextManager.from_dict(cm_data)
                if self._session_id:
                    self._db.ensure_session(self._session_id, source="smith", model=PLANNING_MODEL)
                    log.info(
                        f"Loaded session {self._session_id} "
                        f"({len(self._history)} msgs, turn {self._context_mgr._turn_count})"
                    )
                    return
            except (json.JSONDecodeError, KeyError) as e:
                log.warning(f"Failed to load session: {e}")
        self._new_session()

    def _new_session(self):
        ts = time.strftime("%Y%m%d_%H%M%S")
        self._session_id = f"{ts}_{uuid.uuid4().hex[:8]}"
        self._history = []
        self._context_mgr = ContextManager()
        self._db.create_session(
            session_id=self._session_id, source="smith",
            model=PLANNING_MODEL, model_config=None,
            system_prompt=None, user_id=self.user_id,
        )
        self._save()
        log.info(f"New session: {self._session_id}")

    def _save(self):
        data = {
            "session_id": self._session_id,
            "session_key": self.session_key,
            "user_id": self.user_id,
            "history": self._history[-80:],
            "context_mgr": self._context_mgr.to_dict(),
            "updated_at": time.time(),
        }
        self._path.write_text(json.dumps(data, indent=2))

    @property
    def session_id(self) -> str:
        return self._session_id

    def get_history(self) -> list:
        with self._lock:
            return list(self._history)

    def get_compact_history(self) -> list:
        """Return compact context for the API: summary + recent turns."""
        with self._lock:
            return self._context_mgr.get_context(self._history)

    def record_turn(self, user_msg: str, assistant_msg: str):
        """Feed a completed turn to the context manager for extraction."""
        with self._lock:
            self._context_mgr.record_turn(user_msg, assistant_msg)

    def append(self, role: str, content: str):
        with self._lock:
            self._history.append({"role": role, "content": content})
            try:
                self._db.append_message(
                    session_id=self._session_id, role=role, content=content,
                )
            except Exception as e:
                log.warning(f"SessionDB append failed: {e}")
            if len(self._history) > 80:
                self._history = self._history[-80:]
            self._save()

    def reset(self):
        with self._lock:
            try:
                self._db.end_session(self._session_id, end_reason="user_reset")
            except Exception:
                pass
            self._new_session()


# ═══════════════════════════════════════════════════════════════════════
# Agent Management
# ═══════════════════════════════════════════════════════════════════════

_sessions: dict = {}
_sessions_lock = threading.Lock()
_agent: Optional[AIAgent] = None
_agent_lock = threading.Lock()


def _get_session(token: str) -> SmithSession:
    uid = _token_hash(token)
    with _sessions_lock:
        if uid not in _sessions:
            _sessions[uid] = SmithSession(uid, _session_db)
        return _sessions[uid]


def _get_agent(session_id: str, stream_callback=None) -> AIAgent:
    global _agent
    if _agent is None:
        _agent = AIAgent(
            model=PLANNING_MODEL, provider=PLANNING_PROVIDER,
            base_url=PLANNING_BASE_URL or None,
            api_key=PLANNING_API_KEY or None,
            max_iterations=MAX_ITERATIONS, quiet_mode=True,
            enabled_toolsets=[
                "terminal", "file", "memory", "skills",
                "session_search", "clarify", "delegation",
            ],
            platform="api_server", session_id=session_id,
            session_db=_session_db,
            stream_delta_callback=stream_callback,
            skip_context_files=False, skip_memory=False,
            reasoning_config={"enabled": True, "effort": "high"},
        )
    else:
        _agent.stream_delta_callback = stream_callback
        _agent.session_id = session_id
    return _agent


def _run_agent_sync(message: str, session: SmithSession, on_delta=None):
    """Run the agent synchronously (call from a thread)."""
    with _agent_lock:
        agent = _get_agent(session.session_id, stream_callback=on_delta)
        # Use compact history (summary + recent turns) instead of full replay
        history = session.get_compact_history()
        # Persist user message BEFORE running the agent so it survives
        # mid-thinking disconnects (the client can see it on reconnect).
        session.append("user", message)
        result = agent.run_conversation(
            user_message=message,
            conversation_history=history,
        )
        final = result.get("final_response", "")
        session.append("assistant", final)
        # Feed the turn to the context manager for signal extraction
        session.record_turn(message, final)
        return final


# ═══════════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════════

app = FastAPI(title="ForgeSmith", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _extract_token(request: Request) -> Optional[str]:
    """Extract token from Authorization header or query param."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return request.query_params.get("token")


# ── Health ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    version = "unknown"
    version_file = Path("/opt/forgesmith/.forge-version")
    if version_file.exists():
        version = version_file.read_text().strip()[:12]
    return {"status": "ok", "service": "forgesmith", "version": version}


# ── History ─────────────────────────────────────────────────────────

@app.get("/history")
async def history(request: Request, limit: int = Query(default=50)):
    token = _verify_token(_extract_token(request))
    if not token:
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    session = _get_session(token)
    messages = session.get_history()[-limit:]
    return {"messages": messages, "session_id": session.session_id}


# ── File Upload ─────────────────────────────────────────────────────

@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = FileParam(...)):
    token = _verify_token(_extract_token(request))
    if not token:
        return JSONResponse(status_code=401, content={"error": "unauthorized"})

    # Save file
    uid = _token_hash(token)
    dest = UPLOADS_DIR / uid
    dest.mkdir(parents=True, exist_ok=True)
    file_path = dest / file.filename
    content = await file.read()
    file_path.write_bytes(content)

    log.info(f"File uploaded: {file.filename} ({len(content)} bytes)")
    return {
        "filename": file.filename,
        "size": len(content),
        "path": str(file_path),
    }


# ── SSE Chat (backward compatible with current HTML UI) ─────────

@app.post("/chat")
async def chat_sse(request: Request):
    token = _verify_token(_extract_token(request))
    if not token:
        return JSONResponse(status_code=401, content={"error": "unauthorized"})

    body = await request.json()
    message = body.get("message", "").strip()
    if not message:
        return JSONResponse(status_code=400, content={"error": "message required"})

    if _agent_lock.locked():
        return JSONResponse(
            status_code=429,
            content={"error": "I'm still working on your last request. Give me a moment!"},
        )

    log.info(f"SSE chat: {message[:80]}...")
    session = _get_session(token)

    import queue as _queue

    stream_q = _queue.Queue()
    error_holder = [None]

    def on_delta(delta):
        if delta is not None:
            stream_q.put(delta)

    def agent_thread():
        try:
            _run_agent_sync(message, session, on_delta=on_delta)
        except Exception as e:
            log.error(f"Agent error: {e}")
            error_holder[0] = str(e)
        finally:
            stream_q.put(None)

    thread = threading.Thread(target=agent_thread, daemon=True)
    thread.start()

    async def event_generator():
        while True:
            try:
                delta = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: stream_q.get(timeout=300)
                )
            except Exception:
                break

            if delta is None:
                if error_holder[0]:
                    yield f"data: {json.dumps({'content': f'Error: {error_holder[0]}'})}\n\n"
                yield "data: [DONE]\n\n"
                break

            yield f"data: {json.dumps({'content': delta})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ── WebSocket Chat (for React UI) ──────────────────────────────────

@app.websocket("/ws")
async def websocket_chat(websocket: WebSocket, token: str = Query(default="")):
    verified = _verify_token(token)
    if not verified:
        await websocket.close(code=4001, reason="unauthorized")
        return

    await websocket.accept()
    session = _get_session(verified)
    log.info(f"WebSocket connected: {session.user_id}")

    # Send history on connect
    history = session.get_history()
    await websocket.send_json({
        "type": "history",
        "messages": history[-50:],
        "session_id": session.session_id,
    })
    await websocket.send_json({"type": "status", "status": "connected"})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "invalid json"})
                continue

            msg_type = msg.get("type", "text")
            text = ""  # Will be set by text/audio/file handlers

            if msg_type == "audio":
                # Voice message — save to file, transcribe, process as text
                audio_data = msg.get("data", "")
                audio_format = msg.get("format", "webm")
                if not audio_data:
                    await websocket.send_json({"type": "error", "message": "empty audio"})
                    continue

                import base64 as _b64
                import tempfile

                audio_bytes = _b64.b64decode(audio_data)
                tmp = tempfile.NamedTemporaryFile(
                    suffix=f".{audio_format}", prefix="voice_", dir=str(UPLOADS_DIR), delete=False,
                )
                tmp.write(audio_bytes)
                tmp.close()
                log.info(f"Voice saved: {tmp.name} ({len(audio_bytes)} bytes)")

                # Transcribe using Hermes STT
                transcript = ""
                try:
                    from tools.transcription_tools import transcribe_audio

                    result = transcribe_audio(tmp.name)
                    if result.get("success"):
                        transcript = result.get("transcript", "").strip()
                        log.info(f"Transcribed: {transcript[:80]}...")
                except ImportError:
                    log.warning("transcription_tools not available")
                except Exception as e:
                    log.error(f"Transcription failed: {e}")

                if not transcript:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Could not transcribe audio. Try typing instead.",
                    })
                    continue

                # Process transcription as a text message
                text = transcript
                # Fall through to text handling below

            if msg_type == "file":
                # File upload — save and tell the agent about it
                file_data = msg.get("data", "")
                file_name = msg.get("name", "file")
                file_mime = msg.get("mime", "")
                if not file_data:
                    await websocket.send_json({"type": "error", "message": "empty file"})
                    continue

                import base64 as _b64

                file_bytes = _b64.b64decode(file_data)
                uid = _token_hash(verified)
                dest = UPLOADS_DIR / uid
                dest.mkdir(parents=True, exist_ok=True)
                file_path = dest / file_name
                file_path.write_bytes(file_bytes)
                log.info(f"File saved: {file_path} ({len(file_bytes)} bytes)")

                # Tell the agent about the uploaded file
                text = f"The user uploaded a file: {file_name} ({file_mime or 'unknown type'}, {len(file_bytes)} bytes). It's saved at {file_path}. Please read and process it."
                # Fall through to text handling below

            if msg_type == "text":
                text = msg.get("content", "").strip()
                if not text:
                    continue

            if text:

                if _agent_lock.locked():
                    await websocket.send_json({
                        "type": "busy",
                        "message": "I'm still working on your last request. Give me a moment!",
                    })
                    continue

                await websocket.send_json({"type": "status", "status": "working"})
                log.info(f"WS message: {text[:80]}...")

                # Run agent in thread, stream deltas back
                import queue as _queue
                stream_q = _queue.Queue()

                def on_delta(delta):
                    if delta is not None:
                        stream_q.put(("delta", delta))

                def agent_thread():
                    try:
                        final = _run_agent_sync(text, session, on_delta=on_delta)
                        stream_q.put(("done", final))
                    except Exception as e:
                        log.error(f"Agent error: {e}")
                        stream_q.put(("error", str(e)))

                thread = threading.Thread(target=agent_thread, daemon=True)
                thread.start()

                # Stream results back via WebSocket
                while True:
                    try:
                        kind, data = await asyncio.get_event_loop().run_in_executor(
                            None, lambda: stream_q.get(timeout=300)
                        )
                    except Exception:
                        await websocket.send_json({"type": "error", "message": "timeout"})
                        break

                    if kind == "delta":
                        await websocket.send_json({"type": "delta", "content": data})
                    elif kind == "done":
                        await websocket.send_json({"type": "done", "content": data})
                        await websocket.send_json({"type": "status", "status": "connected"})
                        break
                    elif kind == "error":
                        await websocket.send_json({"type": "error", "message": data})
                        await websocket.send_json({"type": "status", "status": "connected"})
                        break

            elif msg_type == "history":
                limit = msg.get("limit", 50)
                history = session.get_history()[-limit:]
                await websocket.send_json({"type": "history", "messages": history})

            elif msg_type == "reset":
                session.reset()
                await websocket.send_json({
                    "type": "history", "messages": [],
                    "session_id": session.session_id,
                })

    except WebSocketDisconnect:
        log.info(f"WebSocket disconnected: {session.user_id}")
    except Exception as e:
        log.error(f"WebSocket error: {e}")


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

def main():
    import uvicorn

    if not ACCESS_TOKEN:
        log.warning("FORGESMITH_ACCESS_TOKEN not set — running without auth")
    else:
        log.info(f"Auth enabled (token length: {len(ACCESS_TOKEN)})")

    log.info(f"Planning model: {PLANNING_MODEL}")
    log.info(f"Execution model: {EXECUTION_MODEL}")
    log.info(f"Hermes home: {HERMES_HOME}")
    log.info(f"SessionDB: {DB_PATH}")
    log.info(f"Sessions dir: {SESSIONS_DIR}")

    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")


if __name__ == "__main__":
    main()
