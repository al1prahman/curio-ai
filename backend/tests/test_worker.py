"""Worker + queue tests (no live Redis or worker process required)."""

import uuid

from app.models.document import Document
from app.workers import queue as queue_module
from app.workers.document_jobs import process_document_job


class FakePool:
    def __init__(self) -> None:
        self.jobs: list[tuple] = []

    async def enqueue_job(self, name: str, *args: object) -> object:
        self.jobs.append((name, *args))
        return object()


def _patch_pool(monkeypatch, pool: FakePool) -> None:
    async def fake_get_pool():
        return pool

    monkeypatch.setattr(queue_module, "get_arq_pool", fake_get_pool)


class TestEnqueue:
    async def test_enqueue_calls_pool_with_string_ids(self, monkeypatch):
        pool = FakePool()
        _patch_pool(monkeypatch, pool)
        doc_id = uuid.uuid4()
        org_id = uuid.uuid4()

        await queue_module.enqueue_document_processing(doc_id, org_id)

        assert pool.jobs == [("process_document_job", str(doc_id), str(org_id))]

    async def test_redis_settings_parsed_from_url(self, monkeypatch):
        from arq.connections import RedisSettings

        monkeypatch.setattr(
            queue_module.settings, "REDIS_URL", "redis://localhost:6379/2"
        )
        rs = queue_module._redis_settings()
        assert isinstance(rs, RedisSettings)
        assert rs.host == "localhost"
        assert rs.port == 6379
        assert rs.database == 2


class TestDocumentJob:
    async def test_job_opens_session_and_processes(self, monkeypatch):
        recorded: dict = {}

        class FakeSessionCtx:
            async def __aenter__(self):
                return "fake-session"

            async def __aexit__(self, *args):
                return False

        class FakeDoc:
            processing_status = "COMPLETED"

        async def fake_process_document(db, document_id, organization_id):
            recorded["args"] = (db, document_id, organization_id)
            return FakeDoc()

        monkeypatch.setattr(
            "app.workers.document_jobs.AsyncSessionLocal", lambda: FakeSessionCtx()
        )
        monkeypatch.setattr(
            "app.workers.document_jobs.process_document", fake_process_document
        )

        doc_id = uuid.uuid4()
        org_id = uuid.uuid4()
        result = await process_document_job({}, str(doc_id), str(org_id))

        assert result == "COMPLETED"
        assert recorded["args"] == ("fake-session", doc_id, org_id)


class TestProcessEndpoint:
    async def _make_doc(self, db_session, test_org, admin_user) -> Document:
        doc = Document(
            organization_id=test_org.id,
            uploaded_by=admin_user.id,
            name="buku-kancil.pdf",
            original_filename="buku-kancil.pdf",
            storage_key="test/buku-kancil.pdf",
            mime_type="application/pdf",
            file_size=1234,
            checksum="abc123",
            processing_status="PENDING",
        )
        db_session.add(doc)
        await db_session.commit()
        await db_session.refresh(doc)
        return doc

    async def test_process_returns_202_and_queues(
        self, client, db_session, test_org, admin_user, auth_headers, monkeypatch
    ):
        doc = await self._make_doc(db_session, test_org, admin_user)
        enqueued: list[tuple] = []

        async def fake_enqueue(document_id, organization_id):
            enqueued.append((document_id, organization_id))

        monkeypatch.setattr(
            "app.api.v1.endpoints.documents.enqueue_document_processing", fake_enqueue
        )

        r = await client.post(f"/api/v1/documents/{doc.id}/process", headers=auth_headers)

        assert r.status_code == 202
        assert r.json()["processing_status"] == "QUEUED"
        assert enqueued == [(doc.id, test_org.id)]

    async def test_process_returns_503_when_queue_down(
        self, client, db_session, test_org, admin_user, auth_headers, monkeypatch
    ):
        doc = await self._make_doc(db_session, test_org, admin_user)

        async def failing_enqueue(document_id, organization_id):
            raise ConnectionError("redis down")

        monkeypatch.setattr(
            "app.api.v1.endpoints.documents.enqueue_document_processing", failing_enqueue
        )

        r = await client.post(f"/api/v1/documents/{doc.id}/process", headers=auth_headers)

        assert r.status_code == 503


class TestUploadAutoEnqueue:
    async def test_upload_auto_enqueues_processing(
        self, client, auth_headers, monkeypatch
    ):
        enqueued: list[uuid.UUID] = []

        async def fake_enqueue(document_id, organization_id):
            enqueued.append(document_id)

        monkeypatch.setattr(
            "app.api.v1.endpoints.documents.enqueue_document_processing", fake_enqueue
        )

        r = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files={"files": ("buku-kancil.txt", b"Si Kancil sangat cerdik.", "text/plain")},
        )

        assert r.status_code == 201
        body = r.json()
        assert body["uploaded"][0]["processing_status"] == "QUEUED"
        assert len(enqueued) == 1

    async def test_upload_survives_queue_failure(self, client, auth_headers, monkeypatch):
        async def failing_enqueue(document_id, organization_id):
            raise ConnectionError("redis down")

        monkeypatch.setattr(
            "app.api.v1.endpoints.documents.enqueue_document_processing", failing_enqueue
        )

        r = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files={"files": ("catatan.txt", b"hello", "text/plain")},
        )

        assert r.status_code == 201
        assert r.json()["uploaded"][0]["processing_status"] == "PENDING"
