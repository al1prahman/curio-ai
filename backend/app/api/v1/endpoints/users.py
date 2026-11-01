import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import DbSession, require_permission
from app.models.user import User
from app.schemas.user import (
    UserCreateRequest,
    UserDetail,
    UserListItem,
    UserListResponse,
    UserUpdateRequest,
)
from app.services.user import (
    create_user,
    deactivate_user,
    get_user,
    list_users,
    update_user,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=UserListResponse)
async def get_users(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("users.view"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
) -> UserListResponse:
    users, total = await list_users(db, current_user.organization_id, page, page_size, search)
    return UserListResponse(
        items=[UserListItem.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserDetail, status_code=status.HTTP_201_CREATED)
async def create_new_user(
    data: UserCreateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("users.create"))],
) -> UserDetail:
    user = await create_user(
        db,
        organization_id=current_user.organization_id,
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        role=data.role,
    )
    return UserDetail.model_validate(user)


@router.get("/{user_id}", response_model=UserDetail)
async def get_user_detail(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("users.view"))],
) -> UserDetail:
    user = await get_user(db, user_id, current_user.organization_id)
    return UserDetail.model_validate(user)


@router.patch("/{user_id}", response_model=UserDetail)
async def update_user_detail(
    user_id: uuid.UUID,
    data: UserUpdateRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("users.update"))],
) -> UserDetail:
    user = await get_user(db, user_id, current_user.organization_id)
    user = await update_user(
        db,
        user,
        full_name=data.full_name,
        role=data.role,
        user_status=data.status,
    )
    return UserDetail.model_validate(user)


@router.delete("/{user_id}", response_model=UserDetail)
async def deactivate_user_detail(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("users.delete"))],
) -> UserDetail:
    user = await get_user(db, user_id, current_user.organization_id)
    user = await deactivate_user(db, user)
    return UserDetail.model_validate(user)
