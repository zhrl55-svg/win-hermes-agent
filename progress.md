# Progress

## 2026-04-14
- Read workspace instructions and relevant skill guidance for this new `web-ui` task.
- Restored planning context and replaced the old Windows-only task plan with a new web UI integration plan.
- Confirmed the repository has active uncommitted changes outside `web-ui`, so edits must stay scoped to the requested integration work.
- Identified that source inspection must avoid generated frontend directories to keep the analysis tractable.
- Replaced the standalone `web-ui` backend runtime with a thin FastAPI adapter around Hermes core `AIAgent`, shared `SessionDB`, shared CLI config loading, and shared toolset resolution.
- Expanded the backend API to cover runtime inspection, SSE chat streaming, session listing/loading/renaming/deletion, and interrupt handling.
- Rebuilt the frontend around shared-session browsing, runtime/tool activity display, model override, session title editing, interrupt support, and resilient SSE parsing.
- Removed the frontend hardcoded API host and switched it to configurable `VITE_API_BASE_URL` with same-origin `/api` as the default.
- Added backend API tests for runtime, sessions, and SSE output; verified they pass with `3 passed`.
- Revalidated the frontend with `npm run lint`, `npm run build`, and an escalated `vite` dev/preview smoke test.
- Reduced the frontend entry bundle by splitting React and Ant Design into separate chunks; `antd` remains the main residual large chunk.
- Confirmed the real shared Hermes home is present under `C:\Users\zhrl5\.hermes` with a configured default model (`MiniMax-M2.7`) and persisted session database.
- Verified with a streaming smoke test that the web backend emits real shared-runtime SSE events immediately, reports the real model/toolsets, and can interrupt a slow model turn cleanly.
- Extended the web runtime surface so the frontend can see shared configured model targets and override `model` / `provider` / `base_url` per turn instead of being pinned to a single default backend target.
- Completed a real browser-driven validation against temporary local ports (`8014` backend, `5175` frontend): the page loaded, fetched shared runtime data, displayed the real model/provider, submitted a prompt, surfaced runtime activity, and exposed the stop path during the active turn.
- Fixed a real browser integration bug discovered during that validation: backend CORS allowed only `5173`, which blocked cross-origin dev verification on `5174`/`5175`. The backend now accepts local `localhost` / `127.0.0.1` development ports via explicit origins plus regex.
