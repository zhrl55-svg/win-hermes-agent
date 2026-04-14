"""Hermes Web UI backend.

The backend is intentionally thin: it exposes FastAPI endpoints while routing
all conversation work through the shared Hermes runtime adapter.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from hermes_agent import service


app = FastAPI(title="Hermes Web UI", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    session_id: str | None = None
    model: str | None = None
    provider: str | None = None
    base_url: str | None = None


class RenameSessionRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@app.get("/")
async def root():
    settings = service.get_runtime_settings()
    return {
        "status": "ok",
        "service": "Hermes Web UI",
        "version": app.version,
        "model": settings.model,
        "enabled_toolsets": settings.enabled_toolsets,
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "sessions": len(service.list_sessions()),
    }


@app.get("/runtime")
async def runtime_info():
    settings = service.get_runtime_settings()
    return {
        "model": settings.model,
        "provider": settings.provider,
        "base_url": settings.base_url,
        "max_turns": settings.max_turns,
        "enabled_toolsets": settings.enabled_toolsets,
        "available_models": settings.available_models,
    }


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    session_id, event_stream = await service.stream_conversation(
        req.message,
        session_id=req.session_id,
        model_override=req.model,
        provider_override=req.provider,
        base_url_override=req.base_url,
    )

    async def generate():
        async for event in event_stream:
            yield _sse(event)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.websocket("/ws/chat/{session_id}")
async def chat_websocket(ws: WebSocket, session_id: str):
    await ws.accept()
    try:
        while True:
            payload = await ws.receive_json()
            request = ChatRequest(
                message=str(payload.get("message") or ""),
                session_id=session_id,
                model=payload.get("model"),
            )
            _, event_stream = await service.stream_conversation(
                request.message,
                session_id=request.session_id,
                model_override=request.model,
                provider_override=request.provider,
                base_url_override=request.base_url,
            )
            async for event in event_stream:
                await ws.send_json(event)
    except WebSocketDisconnect:
        service.interrupt_session(session_id)


@app.get("/sessions")
async def list_sessions():
    return {"sessions": service.list_sessions()}


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = service.get_session_meta(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session": session,
        "messages": service.get_session_messages(session["id"]),
    }


@app.get("/sessions/{session_id}/turns")
async def get_session_turns(session_id: str):
    """Return current message count for the session. Frontend polls this to detect CLI changes."""
    messages = service.get_session_messages(session_id)
    return {"count": len(messages), "session_id": session_id}


@app.patch("/sessions/{session_id}")
async def rename_session(session_id: str, req: RenameSessionRequest):
    try:
        updated = service.rename_session(session_id, req.title)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok"}


@app.post("/sessions/{session_id}/interrupt")
async def interrupt_session(session_id: str):
    interrupted = service.interrupt_session(session_id)
    if not interrupted:
        raise HTTPException(status_code=404, detail="Session is not currently running")
    return {"status": "ok"}


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    if not service.delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
