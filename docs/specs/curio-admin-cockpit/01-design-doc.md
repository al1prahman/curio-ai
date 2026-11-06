# 01 — Design Doc: CurioAI Admin Cockpit

## One-line summary

An admin cockpit for CurioAI: bulk-upload PDFs through a background worker, then
control document visibility per employee — default-visible-to-all with per-document
restriction (the "Kancil 1" action) and per-user re-grants — all enforced at the
Qdrant retrieval layer.

## Problem / purpose

CurioAI's RBAC engine works but has no cockpit: admins can only operate via raw
API, document processing blocks the request for minutes on bulk uploads, and the
default-deny employee model makes "95 of 100 PDFs are for everyone" unusable.

## Product philosophy

- **Default open, exception-driven.** Internal knowledge base: employees see
  everything by default; admin's job is to wall off the sensitive few, not to
  grant the many.
- **Enforcement at retrieval, not at UI.** Permission changes must alter what the
  vector search can return, never just what's displayed.
- **Admin does everything from the UI.** No API-only operations after this package.

## Target user

- **Admin** (single org): uploads materials, manages employee accounts, walls off
  sensitive documents, monitors processing.
- **Employee**: searches/chats, sees only what they're allowed to. Zero new UI
  for employees in this package.

## Core concept: permission model v2

Current: EMPLOYEE default-deny, access = explicit grants only.
New (approved by user):

| Concept | Rule |
|---|---|
| `documents.visibility` | New column: `ALL_EMPLOYEES` (default on upload) or `RESTRICTED` |
| Employee access | All org docs where `visibility = ALL_EMPLOYEES`, **plus** any `RESTRICTED` doc with an explicit grant for that user or their role |
| Admin/Manager | Unchanged: all org docs (no filter) |
| Restriction action | Admin marks doc RESTRICTED → invisible to all employees instantly |
| Re-grant | On a RESTRICTED doc, admin grants READ to a user or role → they see it again |

`document_permissions` table keeps its role: it becomes the re-grant/exception
table on top of default-allow (READ/WRITE/MANAGE levels unchanged).

## Desired behavior (the Kancil scenario)

1. Admin uploads Buku Kancil 1 + 2 → both queued → worker processes → both
   `COMPLETED`, visibility `ALL_EMPLOYEES`.
2. Admin opens Kancil 1 detail → clicks "Batasi akses" → visibility `RESTRICTED`.
3. Employee searches "kancil" → retrieval filter excludes Kancil 1 → answers and
   citations come only from Kancil 2. Admin searching "kancil" still sees both.

## Key features

1. **Background ingestion worker** (ARQ + Redis) — prerequisite for bulk upload
2. **Users management page** — admin creates/deactivates employees, assigns role
3. **Document detail + permission panel** — visibility toggle, grant list, add/remove
4. **Documents list upgrades** — visibility badges, bulk restrict/allow, live
   processing status polling
5. **Seed employee demo user**

Explicitly unchanged: chat flow, retrieval, prompts, auth, org isolation.

## Technical shape

- **Worker:** ARQ (async-native, Redis already deployed). New `app/workers/`
  module (PRD's planned structure). Upload/process endpoints enqueue and return
  202; document status gains `QUEUED`. Retries with backoff via ARQ.
- **Permission query (single round-trip):**
  ```sql
  SELECT d.id FROM documents d
  WHERE d.organization_id = :org AND d.deleted_at IS NULL
    AND (d.visibility <> 'RESTRICTED'
         OR EXISTS (SELECT 1 FROM document_permissions p
                    WHERE p.document_id = d.id
                      AND (p.user_id = :uid OR p.role = :role)))
  ```
  ADMIN/MANAGER → `None` (no filter), unchanged.
- **Migration:** Alembic adds `documents.visibility` (default `ALL_EMPLOYEES`,
  backfill existing rows to `ALL_EMPLOYEES` — deliberate behavior change, approved).
- **API additions:** `PATCH /documents/{id}/visibility`, bulk
  `POST /documents/bulk-visibility`, grant/revoke endpoints already exist.
  Users endpoints already exist — frontend consumes them.
- **Frontend:** new routes `/settings/users`, `/documents/[id]`; upgrade
  `/documents`. TanStack Query for server state (already installed, currently
  unused — adopt it for the new pages).

## Data / integrations / platform

- No new infrastructure. No new providers. Postgres/Qdrant/Redis/MinIO as-is.
- Web only (desktop-first, responsive). Single org.

## Non-goals

- Org settings UI / multi-tenant cockpit
- Email invites, self-signup, password reset flows
- OCR, hybrid search, embedding model upgrade (separate later packages)
- Rewriting RAG pipeline, chat, or auth
- E2E/Playwright suite (P3, separate)

## PRD deviation (recorded, approved)

PRD.json states employees retrieve only authorized documents under a
default-deny reading. This package implements the user-approved default-allow
model. Enforcement location (retrieval filter) is unchanged; only the default
flips. PRD.json gets a patch note at implementation time.

## Open questions

- None blocking. Minor: whether bulk actions apply per-collection or per-selection
  (default: per-selection + per-collection both offered).

## Next steps

UI design brief (`02-ui-design-brief.md`) → implementation spec →
agent build handoff → spec review.
