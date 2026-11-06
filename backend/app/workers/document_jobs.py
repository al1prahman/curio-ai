"""ARQ job definitions.

Jobs own their own DB session (workers run outside the request cycle).
The ingestion pipeline itself stays in app.rag.pipeline — this module only
adapts it to the ARQ job interface.
"""

import uuid
from typing import Any

from app.core.database import AsyncSessionLocal
from app.rag.pipeline import process_document


async def process_document_job(
    ctx: dict[str, Any],  # noqa: ARG001 - ARQ injects job context
    document_id: str,
    organization_id: str,
) -> str:
    """Process a single document through the RAG ingestion pipeline.

    Returns the final processing status. process_document swallows pipeline
    errors and marks the document FAILED, so this job itself does not raise
    for document-level failures — retry is a deliberate admin action
    (POST /documents/{id}/process).
    """
    async with AsyncSessionLocal() as db:
        doc = await process_document(
            db,
            uuid.UUID(document_id),
            uuid.UUID(organization_id),
        )
        return doc.processing_status
