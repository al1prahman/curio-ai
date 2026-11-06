# 00 — Idea Capture

**Title:** CurioAI Admin Cockpit — RBAC Operations & Background Ingestion
**Mode:** Full
**Captured:** 2026-11-06
**Status:** interviewing

## Summary

Turn CurioAI from a RAG demo into a working "sistem administrasi": admin
bulk-uploads PDFs (materi, dokumen pelajaran, mockup interview), then controls
exactly which documents each employee can read. Employees search/chat and only
ever retrieve documents they're granted — enforced at the Qdrant retrieval
layer, not just UI hiding.

Reference scenario (from user): upload "Buku Kancil 1" + "Buku Kancil 2" →
admin sees both automatically (uploaded by admin) → admin sets Kancil 1 as
not accessible to employees → employee searching "kancil" only ever sees and
gets answers from Kancil 2 material.

## Problem

- Backend RBAC + retrieval filtering already exists and is correct:
  ADMIN/MANAGER see all org docs; EMPLOYEE is default-deny with explicit
  grants (`document_permissions`: doc + user_id OR role + READ/WRITE/MANAGE);
  chat retrieval passes authorized doc ids as a Qdrant filter.
- But there is NO admin UI: no user management page, no permission panel, no
  document detail page. Admin can only operate via raw API.
- Document processing is synchronous in-request — bulk uploads of many PDFs
  hang the request for minutes. PRD specifies a background worker; not built.
- Default-deny means granting 95 of 100 uploaded PDFs one-by-one is unusable;
  need collection-level grants and/or org default visibility.

## Initial bullets

- Background ingestion worker (ARQ + Redis) — prerequisite for bulk upload flow
- Users management page (admin creates/deactivates employee accounts, assigns role)
- Document detail + permission panel (grant/revoke READ per user or role, visual)
- Collection-level grant (1 click grants every doc in a collection)
- Org setting: default visibility for new uploads (none / all employees)
- Seed an EMPLOYEE demo user
- Chat / retrieval / permission enforcement: NO changes (already correct)

## Non-goals (draft)

- Rewriting the RAG pipeline, chunking, or retrieval logic
- New auth system (JWT + Argon2 stays)
- Multi-tenant billing / subscriptions
- Mobile native app
- OCR / hybrid search / embedding upgrade (separate later enhancements)

## Interview decisions (2026-11-06)

- **Default visibility: ALL EMPLOYEES always** — new uploads are visible to every
  employee by default; admin exceptions-out sensitive docs (the "Kancil 1" action).
  This inverts the current default-deny EMPLOYEE model — see design doc for the
  v2 permission model (restriction + re-grant).
- **Scale: single-org internal tool** — multi-org stays in backend untouched; no
  org settings UI, no org switcher in this package.
- **Employee accounts: admin-created manual** (email + password + role) from a
  Users page. No invite/email infrastructure.
- **UI: Full brief** — screens, states, visual direction specced before coding.

## Open questions

- (resolved — see decisions above)
