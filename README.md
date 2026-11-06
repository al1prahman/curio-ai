# CurioAI ☠️

**Your company's knowledge is locked in PDFs nobody reads. Ask it questions — get grounded answers with citations, and access control that actually holds.**

CurioAI is an enterprise knowledge & RAG platform. Upload documents (PDF, DOCX, TXT), and every employee can ask questions in natural language and get answers grounded in *your* documents — with source citations, conversation history, and role-based access that is enforced at the vector-retrieval level, not just hidden in the UI.

---

## Why this exists

Generic chatbots hallucinate. "Just upload it to ChatGPT" fails the moment the knowledge is confidential, stale, or needs a citation you can check.

The hard part is not the chat — it is the access control. An internal knowledge base mixes public handbooks with HR files and interview material. A search that returns a chunk from a restricted document is a data leak, no matter how the UI is dressed. So CurioAI enforces permissions where retrieval happens: the vector search itself is filtered by what the asking user is allowed to see.

---

## What it does

| Layer | What it does | Status |
|---|---|---|
| 📤 Ingestion | Upload PDF/DOCX/TXT, checksum dedup, MinIO storage | ✅ |
| ⚙️ Background processing | ARQ worker + Redis queue — extraction, chunking, embedding, indexing | ✅ |
| 🔍 RAG chat | Grounded answers with source citations + conversation history | ✅ |
| 🔐 RBAC | ADMIN / MANAGER / EMPLOYEE, JWT auth, org isolation | ✅ |
| 🚫 Visibility model | Default `ALL_EMPLOYEES`; admin restricts sensitive docs to explicit grants | ✅ |
| 🎛️ Admin cockpit | Users management, document detail, permission panel, bulk actions | ✅ |
| 📊 Audit trail | Every permission and visibility change is logged | ✅ |

### The permission model (the part that matters)

Documents are visible to all employees by default — because that is what a knowledge base is for. When a document is sensitive, the admin restricts it. A `RESTRICTED` document disappears from every employee's document list **and** from their chat retrieval, unless an explicit grant (user or role) exists.

```
employee asks: "apa isi buku kancil?"
        │
        ▼
get_authorized_document_ids()      ← visibility + grants, one query
        │
        ▼
Qdrant search (org filter + authorized ids only)   ← enforcement lives here
        │
        ▼
LLM answers from allowed chunks only, with citations
```

The scenario is covered end-to-end by `scripts/e2e_kancil.py` — upload two documents, restrict one, and verify the employee can neither list nor retrieve it while the admin sees everything.

---

## What it supports (read this first)

| Capability | Status |
|---|---|
| Document formats | PDF (pypdf), DOCX (python-docx), TXT |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` (384-dim, local) |
| LLM providers | Gemini, OpenAI, Groq, OpenRouter, custom OpenAI-compatible, or `mock` for dev |
| Roles | ADMIN (everything), MANAGER (documents + chat), EMPLOYEE (authorized docs + chat) |
| Multi-tenancy | Organizations with full data isolation; the UI is single-org by design |
| Deployment | Docker Compose for infra (Postgres, Redis, Qdrant, MinIO); app runs native |

---

## Quick start

**1. Start infrastructure**

```bash
docker compose up -d
```

PostgreSQL, Redis, Qdrant, and MinIO.

**2. Backend**

```bash
cd backend
cp ../.env.example .env
uv sync
uv run alembic upgrade head
uv run python ../scripts/seed.py
```

**3. Start the background worker** (required — documents do not process without it)

```bash
cd backend
uv run arq app.workers.worker.WorkerSettings
```

**4. Start the API**

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

**5. Frontend**

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@curio.ai | admin123 |
| Manager | manager@curio.ai | manager123 |
| Employee | budi@curio.ai | budi12345 |

### Document processing flow

```
upload ──► PENDING ──► QUEUED ──► PROCESSING ──► COMPLETED / FAILED
           (saved)     (enqueued)   (worker)       (chunks in Qdrant + PG)
```

Uploads auto-enqueue. If the queue is down the document stays `PENDING` and can be retried from the UI ("Process pending") or via `POST /api/v1/documents/process-all`.

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │                Next.js 15 frontend            │
                    │  dashboard · documents · users · chat         │
                    └───────────────────┬──────────────────────────┘
                                        │ /api/v1 (proxy)
                                        ▼
┌──────────┐   upload   ┌──────────────────────────────────────────────┐
│  Admin   │──────────► │                FastAPI backend               │
└──────────┘            │  auth (JWT) · RBAC · documents · chat        │
                        └───┬──────────┬──────────────┬───────────────┘
                            │          │              │
                     enqueue│          │              │ query (authorized ids only)
                            ▼          ▼              ▼
                       ┌─────────┐ ┌────────┐    ┌─────────┐
                       │  Redis  │ │ MinIO  │    │ Qdrant  │◄──── chunks + vectors
                       │ (ARQ)   │ │ (files)│    └─────────┘
                       └────┬────┘ └────────┘
                            │
                            ▼
                    ┌───────────────────────┐
                    │      ARQ worker       │
                    │ extract → chunk →     │
                    │ embed → index         │
                    └───────────────────────┘
```

---

## API

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/logout | Logout |
| GET | /api/v1/auth/me | Current user |
| POST | /api/v1/auth/refresh | Refresh token |
| GET/POST | /api/v1/users | User management |
| GET/POST | /api/v1/collections | Collections CRUD |
| POST | /api/v1/documents/upload | Upload documents (auto-queued for processing) |
| POST | /api/v1/documents/{id}/process | (Re)queue RAG processing — async, 202 |
| POST | /api/v1/documents/process-all | (Re)queue all PENDING documents — async, 202 |
| GET | /api/v1/documents | List documents |
| GET | /api/v1/documents/{id} | Document detail |
| PATCH | /api/v1/documents/{id}/visibility | Set visibility (ALL_EMPLOYEES / RESTRICTED) |
| POST | /api/v1/documents/bulk-visibility | Bulk visibility update |
| GET/POST/DELETE | /api/v1/documents/{id}/permissions[/{perm_id}] | Document access grants |
| GET | /api/v1/documents/{id}/download | Download document |
| POST | /api/v1/chat/conversations | Create conversation |
| POST | /api/v1/chat/conversations/{id}/messages | Ask question (RAG) |

---

## LLM configuration

Set in `backend/.env`:

```
LLM_PROVIDER=gemini          # gemini, openai, groq, openrouter, custom, mock
LLM_API_KEY=your-key-here
LLM_MODEL=gemini-2.0-flash
```

For development without API keys, use `LLM_PROVIDER=mock`.

---

## Testing

```bash
cd backend
uv run pytest          # 54 tests
uv run mypy app        # strict, 0 errors
uv run ruff check app tests
```

The suite covers the permission model at three levels: unit (`get_authorized_document_ids`), endpoint (visibility + grants), and retrieval enforcement (a restricted document never reaches the Qdrant filter).

End-to-end, against a live stack:

```bash
# infra + backend + worker running, then:
cd backend && uv run python ../scripts/e2e_kancil.py
```

---

## Limitations (the honest list)

- **Embeddings are English-centric.** `all-MiniLM-L6-v2` (384-dim) underperforms on Indonesian enterprise documents. Upgrade path: `bge-m3` + a collection-dimension migration.
- **No hybrid search or reranking** — vector-only, top-k 5, threshold 0.7.
- **No OCR or table extraction.** Scanned PDFs extract nothing; pypdf flattens tables.
- **Chat is not streaming** — request/response, no SSE.
- **The UI is single-org by design.** Multi-tenancy exists in the backend; there is no org switcher.
- **Message feedback has no eval loop yet.** The golden-Q&A-set feature is planned, not built.
- **No CI and no frontend tests** — quality gates are local (pytest, mypy, ruff, `next build`).

---

## Roadmap

- **RAG quality** — `bge-m3` embeddings, hybrid search + reranking, OCR for scanned PDFs
- **Chat** — SSE streaming, feedback → golden Q&A eval loop per org
- **Delivery** — WhatsApp channel (Baileys) + Indonesian language layer
- **Engineering** — CI pipeline, frontend tests, per-org LLM/embedding config

---

## Project structure

```
curio-ai/
  backend/
    app/
      api/v1/endpoints/    # Route handlers
      core/                # Config, database, security, permissions
      models/              # SQLAlchemy models (11 tables)
      schemas/             # Pydantic schemas
      services/            # Business logic
      rag/                 # RAG pipeline (extraction, chunking, embeddings, vectorstore)
      workers/             # ARQ background processing
    alembic/               # Database migrations
    tests/                 # Test suite (54 tests)
  frontend/
    src/
      app/                 # Next.js App Router pages
      lib/                 # API client, utilities
      components/          # AppShell + UI kit
  scripts/
    seed.py                # Demo data seeder (idempotent)
    e2e_kancil.py          # Restricted-access E2E scenario
  docker-compose.yml       # Infrastructure services
```

---

## License

[MIT](LICENSE)
