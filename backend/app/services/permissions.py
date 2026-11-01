import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import DocumentPermission


async def get_document_permissions(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> list[DocumentPermission]:
    result = await db.execute(
        select(DocumentPermission).where(DocumentPermission.document_id == document_id)
    )
    return list(result.scalars().all())


async def set_document_permission(
    db: AsyncSession,
    document_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
    role: str | None = None,
    permission: str = "READ",
) -> DocumentPermission:
    """Grant a permission. Either user_id or role must be set."""
    if user_id is None and role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or role must be provided",
        )

    if permission not in {"READ", "WRITE", "MANAGE"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission must be READ, WRITE, or MANAGE",
        )

    # Check for existing permission to avoid duplicates
    existing = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == document_id,
            DocumentPermission.user_id == user_id,
            DocumentPermission.role == role,
            DocumentPermission.permission == permission,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Permission already granted",
        )

    perm = DocumentPermission(
        document_id=document_id,
        user_id=user_id,
        role=role,
        permission=permission,
    )
    db.add(perm)
    await db.commit()
    await db.refresh(perm)
    return perm


async def remove_document_permission(
    db: AsyncSession,
    permission_id: uuid.UUID,
) -> None:
    result = await db.execute(
        select(DocumentPermission).where(DocumentPermission.id == permission_id)
    )
    perm = result.scalar_one_or_none()
    if perm is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
    await db.delete(perm)
    await db.commit()


async def user_can_access_document(
    db: AsyncSession,
    user_id: uuid.UUID,
    user_role: str,
    document_id: uuid.UUID,
) -> bool:
    """Check if a user can access a document.

    ADMIN and MANAGER can access all documents in their org.
    EMPLOYEE can only access documents with explicit permissions.
    """
    if user_role in ("ADMIN", "MANAGER"):
        return True

    # Check explicit user permission
    result = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == document_id,
            DocumentPermission.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        return True

    # Check role-based permission
    result = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == document_id,
            DocumentPermission.role == user_role,
        )
    )
    return result.scalar_one_or_none() is not None


async def get_authorized_document_ids(
    db: AsyncSession,
    user_id: uuid.UUID,
    user_role: str,
) -> list[uuid.UUID] | None:
    """Get list of document IDs the user can access.

    Returns None for ADMIN/MANAGER (meaning all documents).
    Returns a list of UUIDs for EMPLOYEE (only authorized documents).
    """
    if user_role in ("ADMIN", "MANAGER"):
        return None

    # Get documents with explicit user permission
    result = await db.execute(
        select(DocumentPermission.document_id).where(
            DocumentPermission.user_id == user_id
        )
    )
    doc_ids = {row[0] for row in result.all()}

    # Get documents with role-based permission
    result = await db.execute(
        select(DocumentPermission.document_id).where(
            DocumentPermission.role == user_role
        )
    )
    doc_ids.update(row[0] for row in result.all())

    return list(doc_ids)
