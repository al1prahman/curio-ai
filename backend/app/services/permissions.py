import uuid

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentPermission

# Visibility values: ALL_EMPLOYEES (default) | RESTRICTED
VISIBILITY_ALL = "ALL_EMPLOYEES"
VISIBILITY_RESTRICTED = "RESTRICTED"
VALID_VISIBILITY = {VISIBILITY_ALL, VISIBILITY_RESTRICTED}


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
    """Check if a user can access a document (visibility model v2).

    ADMIN and MANAGER can access all documents in their org.
    EMPLOYEE can access every document except RESTRICTED ones, unless an
    explicit grant (user or role) exists on that document.
    """
    if user_role in ("ADMIN", "MANAGER"):
        return True

    result = await db.execute(
        select(Document.visibility).where(Document.id == document_id)
    )
    visibility = result.scalar_one_or_none()
    if visibility is None:
        return False
    if visibility != VISIBILITY_RESTRICTED:
        return True

    # RESTRICTED: only explicit grants get back in
    result = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == document_id,
            or_(
                DocumentPermission.user_id == user_id,
                DocumentPermission.role == user_role,
            ),
        )
    )
    return result.scalar_one_or_none() is not None


async def get_authorized_document_ids(
    db: AsyncSession,
    user_id: uuid.UUID,
    user_role: str,
    organization_id: uuid.UUID,
) -> list[uuid.UUID] | None:
    """Get list of document IDs the user can access.

    Returns None for ADMIN/MANAGER (meaning all documents — no filter).
    Returns a list of UUIDs for EMPLOYEE: every org document that is not
    RESTRICTED, plus RESTRICTED documents with an explicit grant for this
    user or their role. This is the retrieval-level enforcement point.
    """
    if user_role in ("ADMIN", "MANAGER"):
        return None

    result = await db.execute(
        select(Document.id)
        .select_from(Document)
        .outerjoin(
            DocumentPermission,
            and_(
                DocumentPermission.document_id == Document.id,
                or_(
                    DocumentPermission.user_id == user_id,
                    DocumentPermission.role == user_role,
                ),
            ),
        )
        .where(
            Document.organization_id == organization_id,
            Document.deleted_at.is_(None),
            or_(
                Document.visibility != VISIBILITY_RESTRICTED,
                DocumentPermission.id.is_not(None),
            ),
        )
        .distinct()
    )
    return [row[0] for row in result.all()]
