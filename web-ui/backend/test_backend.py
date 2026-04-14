from __future__ import annotations

import os
import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_HERMES_HOME = BACKEND_DIR / ".test-hermes-home"
TEST_HERMES_HOME.mkdir(exist_ok=True)
os.environ.setdefault("HERMES_HOME", str(TEST_HERMES_HOME))

import main as backend_main


class FakeService:
    def __init__(self):
        self.interrupted = False
        self.deleted = False
        self.renamed = None

    def get_runtime_settings(self):
        return SimpleNamespace(
            model="demo-model",
            provider="openrouter",
            base_url="https://example.test/v1",
            max_turns=42,
            enabled_toolsets=["web", "terminal"],
            available_models=[
                {"model": "demo-model", "provider": "openrouter", "base_url": "https://example.test/v1"},
                {"model": "fast-model", "provider": "local", "base_url": "http://localhost:11434/v1"},
            ],
        )

    async def stream_conversation(
        self,
        message: str,
        *,
        session_id: str | None = None,
        model_override: str | None = None,
        provider_override: str | None = None,
        base_url_override: str | None = None,
    ):
        async def gen():
            yield {
                "type": "session",
                "session_id": session_id or "new-session",
                "model": model_override or "demo-model",
                "enabled_toolsets": ["web", "terminal"],
            }
            yield {"type": "chunk", "content": f"echo:{message}"}
            yield {"type": "done", "content": "done", "session_id": session_id or "new-session", "messages": [{"role": "assistant", "content": "done"}]}

        return session_id or "new-session", gen()

    def list_sessions(self):
        return [{"id": "s1", "title": "Session 1", "preview": "hello", "message_count": 2, "source": "cli", "model": "demo-model", "last_active": 1}]

    def get_session_meta(self, session_id: str):
        if session_id != "s1":
            return None
        return {"id": "s1", "title": "Session 1"}

    def get_session_messages(self, _session_id: str):
        return [{"role": "user", "content": "hi"}]

    def rename_session(self, session_id: str, title: str):
        if session_id != "s1":
            return False
        self.renamed = title
        return True

    def interrupt_session(self, session_id: str, message: str = "Interrupted from web UI."):
        if session_id != "s1":
            return False
        self.interrupted = True
        return True

    def delete_session(self, session_id: str):
        if session_id != "s1":
            return False
        self.deleted = True
        return True


def _client():
    backend_main.service = FakeService()
    return TestClient(backend_main.app), backend_main.service


def test_runtime_endpoint():
    client, _service = _client()
    resp = client.get("/runtime")
    assert resp.status_code == 200
    assert resp.json()["model"] == "demo-model"
    assert resp.json()["enabled_toolsets"] == ["web", "terminal"]
    assert resp.json()["available_models"][1]["provider"] == "local"


def test_session_endpoints():
    client, service = _client()

    list_resp = client.get("/sessions")
    assert list_resp.status_code == 200
    assert list_resp.json()["sessions"][0]["id"] == "s1"

    get_resp = client.get("/sessions/s1")
    assert get_resp.status_code == 200
    assert get_resp.json()["messages"][0]["content"] == "hi"

    rename_resp = client.patch("/sessions/s1", json={"title": "Renamed"})
    assert rename_resp.status_code == 200
    assert service.renamed == "Renamed"

    interrupt_resp = client.post("/sessions/s1/interrupt")
    assert interrupt_resp.status_code == 200
    assert service.interrupted is True

    delete_resp = client.delete("/sessions/s1")
    assert delete_resp.status_code == 200
    assert service.deleted is True


def test_stream_endpoint_emits_sse_events():
    client, _service = _client()
    resp = client.post(
        "/chat/stream",
        json={
            "message": "hello",
            "session_id": "s1",
            "model": "fast-model",
            "provider": "local",
            "base_url": "http://localhost:11434/v1",
        },
    )
    assert resp.status_code == 200
    assert "data: " in resp.text
    assert "\"type\": \"chunk\"" in resp.text
    assert "\"type\": \"done\"" in resp.text
