import uuid
from datetime import UTC

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.services.storage import (
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    MAX_FILES_PER_REQUEST,
    StorageService,
    compute_checksum,
)


async def list_documents(
    db: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    user_role: str,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status_filter: str | None = None,
    collection_id: uuid.UUID | None = None,
) -> tuple[list[Document], int]:
    base = select(Document).where(
        Document.organization_id == organization_id,
        Document.deleted_at.is_(None),
    )

    # EMPLOYEE can only see authorized documents
    if user_role == "EMPLOYEE":
        from app.services.permissions import get_authorized_document_ids

        authorized_ids = await get_authorized_document_ids(db, user_id, user_role)
        if authorized_ids is not None:
            if not authorized_ids:
                return [], 0
            base = base.where(Document.id.in_(authorized_ids))

    if search:
        base = base.where(Document.name.ilike(f"%{search}%"))
    if status_filter:
        base = base.where(Document.processing_status == status_filter)
    if collection_id:
        base = base.where(Document.collection_id == collection_id)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    docs = list(result.scalars().all())
    return docs, total


async def get_document(
    db: AsyncSession,
    document_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == organization_id,
            Document.deleted_at.is_(None),
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


async def upload_documents(
    db: AsyncSession,
    organization_id: uuid.UUID,
    uploaded_by: uuid.UUID,
    files: list[tuple[str, str, bytes]],  # (filename, content_type, data)
    collection_id: uuid.UUID | None = None,
) -> tuple[list[Document], list[dict[str, str]]]:
    """Upload multiple documents. Returns (uploaded, skipped)."""
    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {MAX_FILES_PER_REQUEST} files per request",
        )

    storage = StorageService()
    uploaded: list[Document] = []
    skipped: list[dict[str, str]] = []

    for filename, content_type, data in files:
        # Validate MIME type
        if content_type not in ALLOWED_MIME_TYPES:
            skipped.append({"filename": filename, "reason": f"Unsupported type: {content_type}"})
            continue

        # Validate size
        if len(data) > MAX_FILE_SIZE:
            skipped.append({"filename": filename, "reason": "File too large (max 20MB)"})
            continue

        # Check duplicate via checksum
        checksum = compute_checksum(data)
        existing = await db.execute(
            select(Document).where(
                Document.organization_id == organization_id,
                Document.checksum == checksum,
                Document.deleted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none() is not None:
            skipped.append({"filename": filename, "reason": "Duplicate file"})
            continue

        # Store in MinIO
        storage_key = storage.upload(data, filename, content_type)

        doc = Document(
            organization_id=organization_id,
            collection_id=collection_id,
            uploaded_by=uploaded_by,
            name=filename,
            original_filename=filename,
            storage_key=storage_key,
            mime_type=content_type,
            file_size=len(data),
            checksum=checksum,
            processing_status="PENDING",
        )
        db.add(doc)
        uploaded.append(doc)

    await db.commit()
    for doc in uploaded:
        await db.refresh(doc)

    return uploaded, skipped


async def delete_document(db: AsyncSession, doc: Document) -> Document:
    from datetime import datetime

    doc.deleted_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(doc)
    return doc


async def get_document_file(db: AsyncSession, doc: Document) -> tuple[bytes, str, str]:
    """Return (file_data, filename, content_type)."""
    storage = StorageService()
    data = storage.download(doc.storage_key)
    return data, doc.original_filename, doc.mime_type
