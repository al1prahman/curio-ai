import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import DbSession, require_permission
from app.models.user import User
from app.services.document import get_document
from app.services.permissions import (
    get_document_permissions,
    remove_document_permission,
    set_document_permission,
)

router = APIRouter(prefix="/documents", tags=["Document Permissions"])


class PermissionGrant(BaseModel):
    user_id: uuid.UUID | None = None
    role: str | None = None
    permission: str = "READ"


class PermissionResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    user_id: uuid.UUID | None = None
    role: str | None = None
    permission: str

    model_config = {"from_attributes": True}


@router.get("/{document_id}/permissions", response_model=list[PermissionResponse])
async def list_permissions(
    document_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.manage_permissions"))],
) -> list[PermissionResponse]:
    await get_document(db, document_id, current_user.organization_id)
    perms = await get_document_permissions(db, document_id)
    return [PermissionResponse.model_validate(p) for p in perms]


@router.post("/{document_id}/permissions", response_model=PermissionResponse, status_code=201)
async def grant_permission(
    document_id: uuid.UUID,
    data: PermissionGrant,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.manage_permissions"))],
) -> PermissionResponse:
    await get_document(db, document_id, current_user.organization_id)
    perm = await set_document_permission(
        db, document_id, data.user_id, data.role, data.permission
    )
    return PermissionResponse.model_validate(perm)


@router.delete("/{document_id}/permissions/{permission_id}", status_code=204)
async def revoke_permission(
    document_id: uuid.UUID,
    permission_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("documents.manage_permissions"))],
) -> None:
    await get_document(db, document_id, current_user.organization_id)
    await remove_document_permission(db, permission_id)
