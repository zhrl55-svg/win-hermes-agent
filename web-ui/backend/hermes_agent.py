"""Shared Hermes runtime adapter for the Web UI backend.

This module intentionally reuses Hermes core configuration, SessionDB, and
``AIAgent.run_conversation()`` so the web UI and CLI operate on the same
conversation state and tool execution path.
"""

from __future__ import annotations

import asyncio
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Callable

import sys

HERMES_ROOT = Path(__file__).resolve().parents[2]
if str(HERMES_ROOT) not in sys.path:
    sys.path.insert(0, str(HERMES_ROOT))

from hermes_cli.config import ensure_hermes_home, load_config
from hermes_cli.tools_config import _get_platform_tools
from hermes_state import SessionDB
from run_agent import AIAgent


EventEmitter = Callable[[dict[str, Any]], None]


@dataclass(frozen=True)
class RuntimeSettings:
    model: str
    provider: str | None
    base_url: str | None
    max_turns: int
    enabled_toolsets: list[str]
    available_models: list[dict[str, str | None]]


@dataclass
class ActiveRun:
    agent: AIAgent
    lock: threading.Lock


def _resolve_model_settings(config: dict[str, Any]) -> tuple[str, str | None, str | None]:
    """Extract model/provider/base_url from the shared Hermes config."""
    raw_model = config.get("model")
    if isinstance(raw_model, dict):
        model_name = str(raw_model.get("default") or raw_model.get("model") or "").strip()
        provider = str(raw_model.get("provider") or "").strip() or None
        base_url = str(raw_model.get("base_url") or "").strip() or None
        return model_name, provider, base_url
    if isinstance(raw_model, str):
        return raw_model.strip(), None, None
    return "", None, None


def _build_runtime_settings() -> RuntimeSettings:
    config = load_config()
    model, provider, base_url = _resolve_model_settings(config)
    agent_cfg = config.get("agent") or {}
    max_turns = int(agent_cfg.get("max_turns") or 90)
    enabled_toolsets = sorted(_get_platform_tools(config, "cli"))
    available_models: list[dict[str, str | None]] = []

    def add_model(model_name: str | None, provider_name: str | None = None, base_url_value: str | None = None) -> None:
        value = (model_name or "").strip()
        if not value:
            return
        candidate = {
            "model": value,
            "provider": (provider_name or "").strip() or None,
            "base_url": (base_url_value or "").strip() or None,
        }
        if candidate not in available_models:
            available_models.append(candidate)

    add_model(model, provider, base_url)
    for entry in config.get("providers") or []:
        if isinstance(entry, dict):
            add_model(entry.get("model"), entry.get("provider"), entry.get("base_url"))
    fallback_model = config.get("fallback_model") or {}
    if isinstance(fallback_model, dict):
        add_model(fallback_model.get("model"), fallback_model.get("provider"), fallback_model.get("base_url"))
    cheap_model = ((config.get("smart_model_routing") or {}).get("cheap_model") or {})
    if isinstance(cheap_model, dict):
        add_model(cheap_model.get("model"), cheap_model.get("provider"), cheap_model.get("base_url"))
    for entry in config.get("custom_providers") or []:
        if isinstance(entry, dict):
            add_model(entry.get("model"), entry.get("name"), entry.get("base_url"))

    return RuntimeSettings(
        model=model,
        provider=provider,
        base_url=base_url,
        max_turns=max_turns,
        enabled_toolsets=enabled_toolsets,
        available_models=available_models,
    )


def make_session_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{timestamp}_{uuid.uuid4().hex[:6]}"


class HermesWebService:
    """Backend service that exposes Hermes core runtime to the web UI."""

    def __init__(self):
        ensure_hermes_home()
        self.session_db = SessionDB()
        self._active_runs: dict[str, ActiveRun] = {}
        self._runs_lock = threading.Lock()

    def get_runtime_settings(self) -> RuntimeSettings:
        return _build_runtime_settings()

    def _build_agent(
        self,
        session_id: str,
        settings: RuntimeSettings,
        emit: EventEmitter,
        *,
        model_override: str | None = None,
        provider_override: str | None = None,
        base_url_override: str | None = None,
    ) -> AIAgent:
        def status_callback(kind: str, message: str) -> None:
            emit({"type": "status", "kind": kind, "content": message})

        def tool_progress_callback(event: str, tool_name: str, preview: str | None, _args: Any, **kwargs: Any) -> None:
            emit(
                {
                    "type": "tool",
                    "event": event,
                    "tool_name": tool_name,
                    "preview": preview,
                    "duration": kwargs.get("duration"),
                    "is_error": kwargs.get("is_error"),
                }
            )

        return AIAgent(
            model=(model_override or settings.model or "anthropic/claude-opus-4.6"),
            provider=(provider_override or settings.provider),
            base_url=(base_url_override or settings.base_url),
            max_iterations=settings.max_turns,
            enabled_toolsets=settings.enabled_toolsets,
            quiet_mode=True,
            verbose_logging=False,
            session_id=session_id,
            session_db=self.session_db,
            platform="cli",
            status_callback=status_callback,
            tool_progress_callback=tool_progress_callback,
        )

    def get_session_messages(self, session_id: str) -> list[dict[str, Any]]:
        resolved = self.session_db.resolve_session_id(session_id) or session_id
        return self.session_db.get_messages_as_conversation(resolved)

    def get_session_meta(self, session_id: str) -> dict[str, Any] | None:
        resolved = self.session_db.resolve_session_id(session_id) or session_id
        session = self.session_db.get_session(resolved)
        if not session:
            return None
        session["id"] = resolved
        session["title"] = self.session_db.get_session_title(resolved)
        return session

    def list_sessions(self) -> list[dict[str, Any]]:
        sessions = self.session_db.list_sessions_rich(limit=200, include_children=False)
        for session in sessions:
            session["title"] = session.get("title") or ""
        return sessions

    def rename_session(self, session_id: str, title: str) -> bool:
        resolved = self.session_db.resolve_session_id(session_id) or session_id
        return self.session_db.set_session_title(resolved, title)

    def delete_session(self, session_id: str) -> bool:
        resolved = self.session_db.resolve_session_id(session_id) or session_id
        return self.session_db.delete_session(resolved)

    def interrupt_session(self, session_id: str, message: str = "Interrupted from web UI.") -> bool:
        with self._runs_lock:
            active = self._active_runs.get(session_id)
        if not active:
            return False
        active.agent.interrupt(message)
        return True

    def _register_active_run(self, session_id: str, active_run: ActiveRun) -> None:
        with self._runs_lock:
            self._active_runs[session_id] = active_run

    def _clear_active_run(self, session_id: str) -> None:
        with self._runs_lock:
            self._active_runs.pop(session_id, None)

    async def stream_conversation(
        self,
        message: str,
        *,
        session_id: str | None = None,
        model_override: str | None = None,
        provider_override: str | None = None,
        base_url_override: str | None = None,
    ) -> tuple[str, AsyncIterator[dict[str, Any]]]:
        effective_session_id = session_id or make_session_id()
        settings = self.get_runtime_settings()
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

        def emit(event: dict[str, Any]) -> None:
            loop.call_soon_threadsafe(queue.put_nowait, event)

        agent = self._build_agent(
            effective_session_id,
            settings,
            emit,
            model_override=model_override,
            provider_override=provider_override,
            base_url_override=base_url_override,
        )
        active_run = ActiveRun(agent=agent, lock=threading.Lock())
        self._register_active_run(effective_session_id, active_run)
        history = self.get_session_messages(effective_session_id)

        async def generator() -> AsyncIterator[dict[str, Any]]:
            emit(
                {
                    "type": "session",
                    "session_id": effective_session_id,
                    "model": agent.model,
                    "enabled_toolsets": settings.enabled_toolsets,
                }
            )

            def run_turn() -> dict[str, Any]:
                with active_run.lock:
                    return agent.run_conversation(
                        user_message=message,
                        conversation_history=history,
                        stream_callback=lambda delta: emit({"type": "chunk", "content": delta}),
                        task_id=effective_session_id,
                    )

            future = loop.run_in_executor(None, run_turn)

            try:
                while True:
                    if future.done() and queue.empty():
                        break
                    try:
                        event = await asyncio.wait_for(queue.get(), timeout=0.2)
                        yield event
                    except asyncio.TimeoutError:
                        continue

                result = await future
                yield {
                    "type": "done",
                    "content": result.get("final_response", ""),
                    "session_id": effective_session_id,
                    "messages": self.get_session_messages(effective_session_id),
                }
            except Exception as exc:
                yield {
                    "type": "error",
                    "content": f"{type(exc).__name__}: {exc}",
                    "session_id": effective_session_id,
                }
            finally:
                self._clear_active_run(effective_session_id)

        return effective_session_id, generator()


service = HermesWebService()
