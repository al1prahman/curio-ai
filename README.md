# CurioAI

Enterprise Knowledge & AI Intelligence Platform with Retrieval Augmented Generation (RAG).

Upload documents, ask natural language questions, get grounded answers with source citations.

## Tech Stack

- **Backend:** FastAPI (Python 3.13+), SQLAlchemy 2.0 (async), Alembic, Pydantic
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4, TypeScript
- **Databases:** PostgreSQL 16, Qdrant (vector), Redis 7, MinIO (S3-compatible)
- **AI:** sentence-transformers (local embeddings), provider-agnostic LLM (Gemini/OpenAI/Groq/OpenRouter/custom)
- **Infra:** Docker Compose, uv (Python package manager)

## Quick Start

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, Qdrant, and MinIO.

### 2. Setup Backend

```bash
cd backend
cp ../.env.example .env
uv sync
uv run alembic upgrade head
uv run python ../scripts/seed.py
```

### 3. Start Backend

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. Start Background Worker

```bash
cd backend
uv run arq app.workers.worker.WorkerSettings
```

Document processing runs asynchronously through this ARQ worker (Redis queue).
Status flow: `PENDING → QUEUED → PROCESSING → COMPLETED / FAILED`.
Uploads auto-enqueue; failed documents can be retried via
`POST /api/v1/documents/{id}/process` (returns 202 — poll the status endpoint).

### 5. Setup Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # or create with NEXT_PUBLIC_API_URL
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

App: http://localhost:3000

## Demo Credentials

- Admin: admin@curio.ai / admin123
- Manager: manager@curio.ai / manager123

## Features

- JWT authentication with Argon2 password hashing
- Role-based access control (ADMIN, MANAGER, EMPLOYEE)
- Organization data isolation
- Document upload (PDF, DOCX, TXT) with duplicate detection
- RAG pipeline: text extraction, chunking, embedding, vector indexing
- Semantic search with Qdrant
- AI chat with source citations and conversation history
- Collections for organizing documents
- User management (admin)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
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
| GET | /api/v1/documents/{id}/download | Download document |
| POST | /api/v1/chat/conversations | Create conversation |
| POST | /api/v1/chat/conversations/{id}/messages | Ask question (RAG) |

## LLM Configuration

Set in `backend/.env`:

```
LLM_PROVIDER=gemini          # gemini, openai, groq, openrouter, custom, mock
LLM_API_KEY=your-key-here
LLM_MODEL=gemini-2.0-flash
```

For development without API keys, use `LLM_PROVIDER=mock`.

## Project Structure

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
      workers/             # Background processing
    alembic/               # Database migrations
    tests/                 # Test suite
  frontend/
    src/
      app/                 # Next.js App Router pages
      lib/                 # API client, utilities
  scripts/
    seed.py                # Demo data seeder
  docker-compose.yml       # Infrastructure services
```

## License

MIT
