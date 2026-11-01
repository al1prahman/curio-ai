import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import VALID_ROLES
from app.core.security import hash_password
from app.models.user import User


async def list_users(
    db: AsyncSession,
    organization_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> tuple[list[User], int]:
    base = select(User).where(User.organization_id == organization_id)

    if search:
        base = base.where(User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%"))

    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = list(result.scalars().all())
    return users, total


async def get_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id, User.organization_id == organization_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def create_user(
    db: AsyncSession,
    organization_id: uuid.UUID,
    email: str,
    password: str,
    full_name: str,
    role: str,
) -> User:
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {sorted(VALID_ROLES)}",
        )

    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        organization_id=organization_id,
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        role=role,
        status="ACTIVE",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    user: User,
    full_name: str | None = None,
    role: str | None = None,
    user_status: str | None = None,
) -> User:
    if role is not None:
        if role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {sorted(VALID_ROLES)}",
            )
        user.role = role

    if full_name is not None:
        user.full_name = full_name

    if user_status is not None:
        if user_status not in {"ACTIVE", "INACTIVE", "SUSPENDED"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED",
            )
        user.status = user_status

    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(db: AsyncSession, user: User) -> User:
    user.status = "INACTIVE"
    await db.commit()
    await db.refresh(user)
    return user
