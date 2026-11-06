import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    collection_id: uuid.UUID | None = None
    uploaded_by: uuid.UUID
    name: str
    original_filename: str
    mime_type: str
    file_size: int
    checksum: str
    processing_status: str
    visibility: str
    processing_error: str | None = None
    page_count: int | None = None
    created_at: datetime
    updated_at: datetime


class VisibilityUpdate(BaseModel):
    visibility: Literal["ALL_EMPLOYEES", "RESTRICTED"]


class BulkVisibilityUpdate(BaseModel):
    document_ids: list[uuid.UUID]
    visibility: Literal["ALL_EMPLOYEES", "RESTRICTED"]


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int


class DocumentStatusResponse(BaseModel):
    id: uuid.UUID
    processing_status: str
    processing_error: str | None = None


class UploadResponse(BaseModel):
    uploaded: list[DocumentResponse]
    skipped: list[dict[str, str]]
