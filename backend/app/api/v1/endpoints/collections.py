import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, require_permission
from app.models.user import User
from app.schemas.collection import (
    CollectionCreate,
    CollectionListResponse,
    CollectionResponse,
    CollectionUpdate,
)
from app.services.collection import (
    create_collection,
    delete_collection,
    get_collection,
    list_collections,
    update_collection,
)

router = APIRouter(prefix="/collections", tags=["Collections"])


@router.get("", response_model=CollectionListResponse)
async def get_collections(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("collections.view"))],
    search: str | None = None,
) -> CollectionListResponse:
    collections, total = await list_collections(db, current_user.organization_id, search)
    return CollectionListResponse(
        items=[CollectionResponse.model_validate(c) for c in collections],
        total=total,
    )


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_collection(
    data: CollectionCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("collections.manage"))],
) -> CollectionResponse:
    collection = await create_collection(
        db,
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        name=data.name,
        description=data.description,
    )
    return CollectionResponse.model_validate(collection)


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection_detail(
    collection_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("collections.view"))],
) -> CollectionResponse:
    collection = await get_collection(db, collection_id, current_user.organization_id)
    return CollectionResponse.model_validate(collection)


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection_detail(
    collection_id: uuid.UUID,
    data: CollectionUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("collections.manage"))],
) -> CollectionResponse:
    collection = await get_collection(db, collection_id, current_user.organization_id)
    collection = await update_collection(
        db, collection, name=data.name, description=data.description
    )
    return CollectionResponse.model_validate(collection)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection_detail(
    collection_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("collections.manage"))],
) -> None:
    collection = await get_collection(db, collection_id, current_user.organization_id)
    await delete_collection(db, collection)
