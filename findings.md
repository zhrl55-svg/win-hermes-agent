# Findings

## 2026-04-14
- The original `web-ui` backend was a parallel implementation with its own in-memory sessions and ad hoc tool/model wiring, so it could not actually share Hermes CLI config, persisted session history, or tool execution semantics.
- The correct integration seam is the existing Hermes core runtime: `run_agent.AIAgent`, `hermes_state.SessionDB`, `hermes_cli.config.load_config()`, and `hermes_cli.tools_config._get_platform_tools(..., "cli")`.
- The frontend originally hardcoded `http://127.0.0.1:8000`, which would break non-default ports and same-origin deployments. It now defaults to `/api` and accepts `VITE_API_BASE_URL` for explicit overrides.
- Frontend bundling improved after manual chunking, but `antd` still produces a large vendor chunk of roughly `718 kB` minified. That residual is isolated now, but not eliminated.
- Backend tests passed, and live smoke tests confirmed the shared runtime endpoints plus Vite dev/preview startup. A full assistant-turn end-to-end response still depends on the user's real Hermes provider credentials in the shared Hermes home.
- A synchronous `TestClient.post(...).text` smoke script is misleading for SSE: it waits for the entire agent turn to finish and therefore looks "stuck" during slow real model calls. Streaming reads plus explicit interrupt are the correct validation path.
- The real shared web smoke test confirmed the backend announces `MiniMax-M2.7` and the full CLI toolset list on the first SSE event. The observed delay is model-side latency, not loss of session or config sharing.
- Real browser validation uncovered an actual integration bug: the backend CORS policy was pinned to `5173`, so any dev session on `5174` or `5175` failed to fetch `/runtime` and `/sessions` despite the backend being healthy. Expanding local-origin support fixed that.
- In the browser, the Web UI now demonstrably shows the shared runtime model/provider, the persisted session id, the runtime activity panel, the submitted user prompt, and the interrupt/stop path during an active turn. That confirms the end-to-end page wiring, not just API-level smoke coverage.
