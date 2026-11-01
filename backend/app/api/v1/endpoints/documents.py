import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import StreamingResponse
import io

from app.api.deps import DbSession, require_permission
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentStatusResponse,
    UploadResponse,
)
from app.services.document import (
    delete_document,
    get_document,
    get_document_file,
    list_documents,
    upload_documents,
)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=DocumentListResponse)
async def get_documents(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.view"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    collection_id: uuid.UUID | None = None,
) -> DocumentListResponse:
    docs, total = await list_documents(
        db, current_user.organization_id, page, page_size, search, status_filter, collection_id
    )
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_docs(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.upload"))],
    files: list[UploadFile] = File(...),
    collection_id: uuid.UUID | None = Form(None),
) -> UploadResponse:
    file_data = []
    for f in files:
        content = await f.read()
        file_data.append((f.filename or "unknown", f.content_type or "application/octet-stream", content))

    uploaded, skipped = await upload_documents(
        db, current_user.organization_id, current_user.id, file_data, collection_id
    )
    return UploadResponse(
        uploaded=[DocumentResponse.model_validate(d) for d in uploaded],
        skipped=skipped,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document_detail(
    document_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.view"))],
) -> DocumentResponse:
    doc = await get_document(db, document_id, current_user.organization_id)
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.view"))],
) -> DocumentStatusResponse:
    doc = await get_document(db, document_id, current_user.organization_id)
    return DocumentStatusResponse(
        id=doc.id,
        processing_status=doc.processing_status,
        processing_error=doc.processing_error,
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.view"))],
) -> StreamingResponse:
    doc = await get_document(db, document_id, current_user.organization_id)
    data, filename, content_type = await get_document_file(db, doc)
    return StreamingResponse(
        io.BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{document_id}", response_model=DocumentResponse)
async def delete_document_detail(
    document_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.delete"))],
) -> DocumentResponse:
    doc = await get_document(db, document_id, current_user.organization_id)
    doc = await delete_document(db, doc)
    return DocumentResponse.model_validate(doc)
