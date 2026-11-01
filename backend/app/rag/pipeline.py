import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.document import Document, DocumentChunk
from app.rag.chunking import chunk_text
from app.rag.embeddings import EmbeddingService
from app.rag.extraction import extract_text, normalize_text
from app.rag.vectorstore import VectorStore
from app.services.document import get_document
from app.services.storage import StorageService


async def process_document(
    db: AsyncSession,
    document_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> Document:
    """Full RAG ingestion pipeline for a single document.

    1. Fetch document + file from storage
    2. Extract text
    3. Chunk
    4. Embed
    5. Store in Qdrant + PostgreSQL
    6. Update status
    """
    doc = await get_document(db, document_id, organization_id)

    doc.processing_status = "PROCESSING"
    await db.commit()

    try:
        # 1. Download file
        storage = StorageService()
        data = storage.download(doc.storage_key)

        # 2. Extract
        pages = extract_text(data, doc.mime_type)
        full_text = normalize_text("\n\n".join(p.text for p in pages))

        if not full_text.strip():
            raise ValueError("No text could be extracted from document")

        # 3. Chunk
        all_chunks = []
        for page in pages:
            normalized = normalize_text(page.text)
            if normalized.strip():
                page_chunks = chunk_text(
                    normalized,
                    chunk_size=settings.RAG_CHUNK_SIZE,
                    chunk_overlap=settings.RAG_CHUNK_OVERLAP,
                    page_number=page.page_number,
                )
                all_chunks.extend(page_chunks)

        if not all_chunks:
            raise ValueError("No chunks generated from document")

        # 4. Embed
        embedding_service = EmbeddingService()
        texts = [c.content for c in all_chunks]
        vectors = embedding_service.embed_texts(texts)

        # 5. Store in Qdrant
        vector_store = VectorStore()
        qdrant_chunks = []
        for chunk, vector in zip(all_chunks, vectors):
            qdrant_chunks.append(
                {
                    "id": chunk.id,
                    "vector": vector,
                    "organization_id": organization_id,
                    "document_id": document_id,
                    "chunk_index": chunk.chunk_index,
                    "page_number": chunk.page_number,
                    "content": chunk.content,
                }
            )
        vector_store.upsert_chunks(qdrant_chunks)

        # 6. Store chunk metadata in PostgreSQL
        for chunk, vector in zip(all_chunks, vectors):
            db_chunk = DocumentChunk(
                document_id=document_id,
                organization_id=organization_id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                page_number=chunk.page_number,
                vector_id=chunk.id,
                token_count=chunk.token_count,
            )
            db.add(db_chunk)

        doc.page_count = len(pages) if pages else None
        doc.processing_status = "COMPLETED"
        doc.processing_error = None
        await db.commit()
        await db.refresh(doc)

    except Exception as e:
        doc.processing_status = "FAILED"
        doc.processing_error = str(e)[:2000]
        await db.commit()
        await db.refresh(doc)

    return doc


async def process_pending_documents(db: AsyncSession, organization_id: uuid.UUID) -> int:
    """Process all PENDING documents for an organization. Returns count processed."""
    result = await db.execute(
        select(Document).where(
            Document.organization_id == organization_id,
            Document.processing_status == "PENDING",
            Document.deleted_at.is_(None),
        )
    )
    docs = list(result.scalars().all())

    for doc in docs:
        await process_document(db, doc.id, organization_id)

    return len(docs)
