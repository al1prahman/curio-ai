"""Permission model v2 tests: default-allow visibility + retrieval enforcement.

Covers the "Buku Kancil" scenario: admin restricts Kancil 1, employees can
only ever retrieve Kancil 2 — enforced at the Qdrant search filter, not UI.
"""

import uuid

from app.models.document import Document
from app.services.permissions import (
    get_authorized_document_ids,
    set_document_permission,
    user_can_access_document,
)


async def _make_doc(db, org, uploader, name, visibility="ALL_EMPLOYEES") -> Document:
    doc = Document(
        organization_id=org.id,
        uploaded_by=uploader.id,
        name=name,
        original_filename=name,
        storage_key=f"test/{uuid.uuid4().hex}/{name}",
        mime_type="text/plain",
        file_size=10,
        checksum=uuid.uuid4().hex,
        processing_status="COMPLETED",
        visibility=visibility,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


class TestAuthorizedDocumentIds:
    async def test_employee_sees_all_by_default(self, db_session, test_org, admin_user):
        d1 = await _make_doc(db_session, test_org, admin_user, "kancil-1.txt")
        d2 = await _make_doc(db_session, test_org, admin_user, "kancil-2.txt")

        ids = await get_authorized_document_ids(
            db_session, admin_user.id, "EMPLOYEE", test_org.id
        )

        assert ids is not None
        assert set(ids) == {d1.id, d2.id}

    async def test_restricted_doc_excluded(self, db_session, test_org, admin_user):
        d1 = await _make_doc(
            db_session, test_org, admin_user, "kancil-1.txt", visibility="RESTRICTED"
        )
        d2 = await _make_doc(db_session, test_org, admin_user, "kancil-2.txt")

        ids = await get_authorized_document_ids(
            db_session, admin_user.id, "EMPLOYEE", test_org.id
        )

        assert d1.id not in ids
        assert d2.id in ids

    async def test_user_regrant_gets_back_in(self, db_session, test_org, admin_user):
        d1 = await _make_doc(
            db_session, test_org, admin_user, "kancil-1.txt", visibility="RESTRICTED"
        )
        await set_document_permission(
            db_session, document_id=d1.id, user_id=admin_user.id, permission="READ"
        )

        ids = await get_authorized_document_ids(
            db_session, admin_user.id, "EMPLOYEE", test_org.id
        )

        assert d1.id in ids

    async def test_role_regrant_gets_back_in(self, db_session, test_org, admin_user):
        d1 = await _make_doc(
            db_session, test_org, admin_user, "kancil-1.txt", visibility="RESTRICTED"
        )
        await set_document_permission(
            db_session, document_id=d1.id, role="EMPLOYEE", permission="READ"
        )

        ids = await get_authorized_document_ids(
            db_session, admin_user.id, "EMPLOYEE", test_org.id
        )

        assert d1.id in ids

    async def test_admin_and_manager_get_no_filter(self, db_session, test_org, admin_user):
        admin_ids = await get_authorized_document_ids(
            db_session, admin_user.id, "ADMIN", test_org.id
        )
        manager_ids = await get_authorized_document_ids(
            db_session, admin_user.id, "MANAGER", test_org.id
        )
        assert admin_ids is None
        assert manager_ids is None

    async def test_other_org_docs_excluded(self, db_session, test_org, admin_user):
        from app.models.organization import Organization

        other_org = Organization(
            name="Other Org", slug=f"other-{uuid.uuid4().hex[:8]}"
        )
        db_session.add(other_org)
        await db_session.commit()
        await db_session.refresh(other_org)

        mine = await _make_doc(db_session, test_org, admin_user, "mine.txt")
        theirs = await _make_doc(db_session, other_org, admin_user, "theirs.txt")

        ids = await get_authorized_document_ids(
            db_session, admin_user.id, "EMPLOYEE", test_org.id
        )

        assert mine.id in ids
        assert theirs.id not in ids


class TestUserCanAccessDocument:
    async def test_employee_default_access(self, db_session, test_org, admin_user):
        doc = await _make_doc(db_session, test_org, admin_user, "open.txt")
        assert await user_can_access_document(
            db_session, admin_user.id, "EMPLOYEE", doc.id
        )

    async def test_employee_restricted_denied(self, db_session, test_org, admin_user):
        doc = await _make_doc(
            db_session, test_org, admin_user, "hr.txt", visibility="RESTRICTED"
        )
        assert not await user_can_access_document(
            db_session, admin_user.id, "EMPLOYEE", doc.id
        )

    async def test_admin_always_access(self, db_session, test_org, admin_user):
        doc = await _make_doc(
            db_session, test_org, admin_user, "hr.txt", visibility="RESTRICTED"
        )
        assert await user_can_access_document(
            db_session, admin_user.id, "ADMIN", doc.id
        )


class TestVisibilityEndpoints:
    async def test_admin_can_restrict(
        self, client, db_session, test_org, admin_user, auth_headers
    ):
        doc = await _make_doc(db_session, test_org, admin_user, "kancil-1.txt")

        r = await client.patch(
            f"/api/v1/documents/{doc.id}/visibility",
            json={"visibility": "RESTRICTED"},
            headers=auth_headers,
        )

        assert r.status_code == 200
        assert r.json()["visibility"] == "RESTRICTED"

    async def test_employee_cannot_change_visibility(
        self, client, db_session, test_org, admin_user, employee_headers
    ):
        doc = await _make_doc(db_session, test_org, admin_user, "kancil-1.txt")

        r = await client.patch(
            f"/api/v1/documents/{doc.id}/visibility",
            json={"visibility": "RESTRICTED"},
            headers=employee_headers,
        )

        assert r.status_code == 403

    async def test_invalid_visibility_rejected(
        self, client, db_session, test_org, admin_user, auth_headers
    ):
        doc = await _make_doc(db_session, test_org, admin_user, "kancil-1.txt")

        r = await client.patch(
            f"/api/v1/documents/{doc.id}/visibility",
            json={"visibility": "BOGUS"},
            headers=auth_headers,
        )

        assert r.status_code == 422

    async def test_bulk_visibility(
        self, client, db_session, test_org, admin_user, auth_headers
    ):
        d1 = await _make_doc(db_session, test_org, admin_user, "a.txt")
        d2 = await _make_doc(db_session, test_org, admin_user, "b.txt")

        r = await client.post(
            "/api/v1/documents/bulk-visibility",
            json={"document_ids": [str(d1.id), str(d2.id)], "visibility": "RESTRICTED"},
            headers=auth_headers,
        )

        assert r.status_code == 200
        assert r.json()["updated"] == 2


class TestRetrievalEnforcement:
    """The core guarantee: restricted docs never reach the vector search."""

    def _patch_chat_deps(self, monkeypatch, captured: dict) -> None:
        class FakeVectorStore:
            def __init__(self) -> None:
                pass

            def search(self, **kwargs):
                captured.update(kwargs)
                return []

        class FakeEmbeddings:
            def __init__(self) -> None:
                pass

            def embed_query(self, query: str):
                return [0.0] * 384

        class FakeLLM:
            def __init__(self) -> None:
                pass

            def generate(self, system_prompt: str, user_message: str):
                return {"content": "mock answer", "input_tokens": 1, "output_tokens": 1}

        monkeypatch.setattr("app.services.chat.VectorStore", FakeVectorStore)
        monkeypatch.setattr("app.services.chat.EmbeddingService", FakeEmbeddings)
        monkeypatch.setattr("app.services.chat.LLMService", FakeLLM)

    async def test_employee_chat_excludes_restricted_doc(
        self, client, db_session, test_org, admin_user, employee_headers, monkeypatch
    ):
        k1 = await _make_doc(
            db_session, test_org, admin_user, "buku-kancil-1.txt", visibility="RESTRICTED"
        )
        k2 = await _make_doc(db_session, test_org, admin_user, "buku-kancil-2.txt")

        captured: dict = {}
        self._patch_chat_deps(monkeypatch, captured)

        conv = await client.post(
            "/api/v1/chat/conversations", json={"title": "t"}, headers=employee_headers
        )
        r = await client.post(
            f"/api/v1/chat/conversations/{conv.json()['id']}/messages",
            json={"question": "cerita kancil"},
            headers=employee_headers,
        )

        assert r.status_code == 200
        assert k1.id not in captured["document_ids"]
        assert k2.id in captured["document_ids"]

    async def test_admin_chat_gets_no_filter(
        self, client, db_session, test_org, admin_user, auth_headers, monkeypatch
    ):
        await _make_doc(
            db_session, test_org, admin_user, "buku-kancil-1.txt", visibility="RESTRICTED"
        )
        await _make_doc(db_session, test_org, admin_user, "buku-kancil-2.txt")

        captured: dict = {}
        self._patch_chat_deps(monkeypatch, captured)

        conv = await client.post(
            "/api/v1/chat/conversations", json={"title": "t"}, headers=auth_headers
        )
        r = await client.post(
            f"/api/v1/chat/conversations/{conv.json()['id']}/messages",
            json={"question": "cerita kancil"},
            headers=auth_headers,
        )

        assert r.status_code == 200
        assert captured["document_ids"] is None  # no filter = admin sees all

    async def test_employee_document_list_excludes_restricted(
        self, client, db_session, test_org, admin_user, employee_headers
    ):
        await _make_doc(
            db_session, test_org, admin_user, "buku-kancil-1.txt", visibility="RESTRICTED"
        )
        await _make_doc(db_session, test_org, admin_user, "buku-kancil-2.txt")

        r = await client.get("/api/v1/documents", headers=employee_headers)

        names = [d["name"] for d in r.json()["items"]]
        assert "buku-kancil-1.txt" not in names
        assert "buku-kancil-2.txt" in names
