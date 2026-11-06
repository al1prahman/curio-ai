# CurioAI Spec Package — Admin Cockpit

Enhancement package for the curio-ai repo. Mode: **Full**.

## Artifact map

| Stage | File | Status |
|---|---|---|
| 1. Capture | `00-idea-capture.md` | done |
| 2. Interview | (this session) | in progress |
| 3. Design doc | `01-design-doc.md` | done |
| 4. UI design brief | `02-ui-design-brief.md` | done |
| 5. Research pass | folded into design doc | done (codebase + prior recon) |
| 6. Implementation spec | `03-implementation-spec.md` | pending |
| 7. Agent build handoff | `04-agent-build-handoff.md` | pending |
| 8. Spec review | `05-spec-review.md` | pending |

## Context anchors

- Repo: `C:\Users\rahma\OneDrive\文档\ALIP\WORK\curio-ai` (public: al1prahman/curio-ai)
- `PRD.json` at repo root is the master spec — read before implementing anything
- Project rule from PRD: read PRD.json first; don't rewrite the app for small
  fixes; keep API contracts consistent between frontend and backend
- RBAC engine + retrieval-level permission filtering already exist and work —
  this package builds the admin cockpit to operate them, plus the ingestion
  worker that bulk upload requires
