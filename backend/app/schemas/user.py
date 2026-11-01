import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    full_name: str
    email: EmailStr
    role: str
    status: str
    last_login_at: datetime | None = None


class UserDetail(UserListItem):
    created_at: datetime
    updated_at: datetime


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "EMPLOYEE"


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: str | None = None
    status: str | None = None


class UserListResponse(BaseModel):
    items: list[UserListItem]
    total: int
    page: int
    page_size: int
