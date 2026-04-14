# Web UI Integration Plan

## Goal
Make `web-ui` function as a real web surface for Hermes CLI by sharing the same config, session state, and tool execution path with the existing Hermes runtime.

## Phases
- [completed] Inspect `web-ui`, CLI/session/config integration points, and identify architectural gaps
- [completed] Refactor backend to reuse Hermes core session/config/tool paths instead of a parallel implementation
- [completed] Update frontend to expose the missing Hermes CLI capabilities through the shared backend
- [completed] Run backend and frontend tests, plus integration validation

## Errors Encountered
- Recursive file listing on `web-ui` timed out because `frontend/node_modules` and `dist` are present; subsequent inspection will exclude generated directories.
- The workspace sandbox blocks some Vite child-process operations with `spawn EPERM`; `npm run build`, `npm run preview`, and `npm run dev` were validated successfully when re-run outside the restricted sandbox.
- Port `8000` was already occupied by an older `Hermes Web UI` process during validation, so live runtime smoke tests were isolated onto port `8010`.
