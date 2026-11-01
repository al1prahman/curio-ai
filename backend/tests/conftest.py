"""Shared test fixtures."""

import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.organization import Organization
from app.models.user import User

# Use a test database (same PostgreSQL, different schema via transaction rollback)
TEST_DATABASE_URL = "postgresql+asyncpg://curio:curio_dev_password@localhost:5432/curio_ai_test"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(test_engine) -> AsyncGenerator[AsyncClient]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def test_org(db_session) -> Organization:
    org = Organization(
        name="Test Org",
        slug=f"test-{uuid.uuid4().hex[:8]}",
        description="Test organization",
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest.fixture
async def admin_user(db_session, test_org) -> User:
    user = User(
        organization_id=test_org.id,
        email=f"admin-{uuid.uuid4().hex[:8]}@test.com",
        full_name="Test Admin",
        password_hash=hash_password("testpass123"),
        role="ADMIN",
        status="ACTIVE",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def employee_user(db_session, test_org) -> User:
    user = User(
        organization_id=test_org.id,
        email=f"emp-{uuid.uuid4().hex[:8]}@test.com",
        full_name="Test Employee",
        password_hash=hash_password("testpass123"),
        role="EMPLOYEE",
        status="ACTIVE",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def auth_headers(client, admin_user) -> dict[str, str]:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "testpass123"},
    )
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def employee_headers(client, employee_user) -> dict[str, str]:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": employee_user.email, "password": "testpass123"},
    )
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
