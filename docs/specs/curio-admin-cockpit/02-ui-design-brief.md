# 02 — UI Design Brief: Admin Cockpit

## Purpose

UI for the admin-side operations of permission model v2: employee accounts,
document visibility control, and processing visibility. Employee-facing chat is
unchanged.

## Product feel & design principles

- **Match the existing system exactly** — earth-tone tokens, CRM density, Inter,
  14px base, 4px control radius / 10px card radius. No new visual language.
- **Dense tables, quiet chrome.** This is an admin cockpit: information first,
  decoration nowhere. Follow the existing documents table pattern.
- **Actions are one click away, destructive actions are one confirm away.**
- **Status is always visible** — visibility badge + processing badge on every
  document row, no hunting.

## Design tokens (from globals.css — reuse, don't invent)

- Surfaces: `canvas #faf8f5`, `surface #ffffff`, `sunken #f5f2ed`
- Ink: `#1c1917` / `#57534e` / `#78716c`; lines `#e7e5e4` / `#d6d3d1`
- Accent (ochre): `#b45309` / hover `#92400e` / soft `#fef3c7`
- Status: ok `#15803d`/soft `#dcfce7`, warn `#a16207`/soft `#fef9c3`, bad `#b91c1c`/soft `#fee2e2`
- Radii: `rounded-ctrl` (4px) controls, `rounded-card` (10px) cards

## Component inventory

Exists (ui.tsx): Button (primary/default/ghost/danger, sm/md), Card, Badge
(neutral/ok/warn/bad/accent), EmptyState, LoadingState, ErrorState, PageHeader.

To build (all token-compliant, shadcn-style, no new deps):
- `Table` — dense rows, 13px, `sunken` header row, hover `surface`
- `Modal` — `surface` card on `ink/40` scrim, focus-trapped, Esc to close
- `Input` / `Select` — 4px radius, `line` border, `accent` focus ring
- `Switch` — visibility toggle, `accent` when on
- `InlineAlert` — ok/warn/bad soft backgrounds, 13px
- `ConfirmDialog` — for destructive/visibility changes
- `Pagination` — reuse existing documents pattern

## Screens

### 1. `/settings/users` — User Management (new)

- **Layout:** PageHeader ("Users", "Kelola akun karyawan") + primary action
  "Tambah Karyawan". Dense table: Name | Email | Role (badge) | Status (badge) |
  Last login | actions (edit role, deactivate).
- **Create/edit modal:** Email, Full name, Password (create only), Role select
  (EMPLOYEE / MANAGER / ADMIN). Inline validation (email format, password min 8).
- **States:** empty (no users beyond admin → prompt to create first employee);
  loading (skeleton rows); error (ErrorState with retry); success (InlineAlert ok
  "Karyawan dibuat"); permission (non-admin → 403 panel "Admin only").
- **Actions:** deactivate → ConfirmDialog ("Nonaktifkan akun ini? Karyawan tidak
  akan bisa login.") → status badge flips to non-active.

### 2. `/documents/[id]` — Document Detail + Permission Panel (new)

- **Layout:** two-column on desktop: left = document info (name, type, size,
  pages, uploader, processing status + error if FAILED with retry button);
  right = **Permission Panel**.
- **Permission Panel (the core screen):**
  - Visibility section: Switch "Visible to all employees" (on = ALL_EMPLOYEES).
    Flipping off → ConfirmDialog ("Batasi akses? Dokumen tidak akan muncul untuk
    karyawan.") → badge on documents list flips to "Terbatas".
  - Grants section: table of re-grants (User or Role | Level | granted date |
    remove). "Tambah akses" → modal: pick target type (user select / role select),
    level READ. Only meaningful when RESTRICTED — when ALL_EMPLOYEES show a hint:
    "Semua karyawan sudah bisa akses. Batasi dulu untuk memberi akses spesifik."
- **States:** empty grants ("Belum ada akses khusus"); loading; error; permission
  (employee → 403, no panel); processing (badge + auto-poll until COMPLETED).

### 3. `/documents` — List upgrades (existing page)

- Add **visibility badge** per row: "Semua karyawan" (neutral) / "Terbatas" (warn).
- Add **processing badge** per row: PENDING/QUEUED/PROCESSING (warn, pulsing dot),
  COMPLETED (ok), FAILED (bad + retry action). Auto-poll every 3s while any row
  is in a non-terminal state.
- **Bulk actions:** checkbox column → selection bar appears: "Batasi akses (n)" /
  "Izinkan semua (n)" → ConfirmDialog → applies.
- Row click → `/documents/[id]`.
- Existing upload flow unchanged (now enqueues to worker; upload response shows
  "queued" state immediately).

### 4. `/chat` — unchanged

Note explicitly: no UI changes. Retrieval filtering is invisible to employees by
design (they simply never see restricted results).

## Key user flows

1. **Bulk upload:** drag 50 PDFs → all rows appear PENDING → badges move
   PENDING→QUEUED→PROCESSING→COMPLETED live (worker) → done, no page refresh.
2. **Wall off Kancil 1:** documents row → detail → toggle visibility off →
   confirm → badge "Terbatas". Employee chat now blind to it.
3. **Re-grant to one employee:** on the RESTRICTED doc → Tambah akses → pick user
   → row added → that employee sees it again, others don't.
4. **Create employee:** Users → Tambah Karyawan → fill → save → employee logs in,
   sees everything except restricted docs.

## States matrix (all screens)

Empty (first-run: no docs / no users) · Loading (skeletons, not spinners-only) ·
Error (ErrorState + retry) · Success (InlineAlert ok, auto-dismiss 4s) ·
Permission (403 panel, no dead buttons) · Processing (live badges + poll).

## Visual direction

Conservative — extend the existing earth-tone CRM system. No new colors, no new
fonts, no gradient/slop. Density matches the current documents table.

## Accessibility & responsiveness

- Reuse existing `:focus-visible` accent ring; all interactive elements keyboard
  reachable; modals focus-trapped with Esc.
- Tables scroll horizontally on <768px; permission panel stacks under info.
- Contrast: ink on surface / sunken passes AA; warn/bad badges use soft+strong
  pairs already in the palette.

## Copy notes

UI copy stays English to match existing pages (ErrorState, buttons). Product
name "CurioAI". Button labels: "Tambah Karyawan", "Batasi akses",
"Izinkan semua", "Tambah akses", "Nonaktifkan".

## Optional image-generation concepts (skipped — text-only)

If visual exploration is wanted later: (1) conservative — current system extended;
(2) strong-fit — dense two-column detail with permission panel right;
(3) divergent — command-center with bulk-action bar pinned. Prompts to be
written at that time; not needed for implementation.

## Handoff notes

Build components in `components/ui.tsx` (extend, don't fork). Pages follow the
existing `documents/page.tsx` structure (useEffect + api.ts now; TanStack Query
for new pages per design doc). All new pages are client components behind the
existing AppShell.
