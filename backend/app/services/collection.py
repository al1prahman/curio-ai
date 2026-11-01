import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Collection


async def list_collections(
    db: AsyncSession,
    organization_id: uuid.UUID,
    search: str | None = None,
) -> tuple[list[Collection], int]:
    base = select(Collection).where(Collection.organization_id == organization_id)

    if search:
        base = base.where(Collection.name.ilike(f"%{search}%"))

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(base.order_by(Collection.created_at.desc()))
    collections = list(result.scalars().all())
    return collections, total


async def get_collection(
    db: AsyncSession,
    collection_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> Collection:
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.organization_id == organization_id,
        )
    )
    collection = result.scalar_one_or_none()
    if collection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    return collection


async def create_collection(
    db: AsyncSession,
    organization_id: uuid.UUID,
    created_by: uuid.UUID,
    name: str,
    description: str | None = None,
) -> Collection:
    collection = Collection(
        organization_id=organization_id,
        created_by=created_by,
        name=name,
        description=description,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    return collection


async def update_collection(
    db: AsyncSession,
    collection: Collection,
    name: str | None = None,
    description: str | None = None,
) -> Collection:
    if name is not None:
        collection.name = name
    if description is not None:
        collection.description = description

    await db.commit()
    await db.refresh(collection)
    return collection


async def delete_collection(db: AsyncSession, collection: Collection) -> None:
    # Documents in this collection are NOT deleted; their collection_id is set to NULL
    from app.models.document import Document

    result = await db.execute(
        select(Document).where(Document.collection_id == collection.id)
    )
    for doc in result.scalars().all():
        doc.collection_id = None

    await db.delete(collection)
    await db.commit()
