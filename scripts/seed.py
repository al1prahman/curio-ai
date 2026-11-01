"""Seed script for CurioAI demo data.

Creates a demo organization, admin user, manager user, and a sample document.

Usage:
    cd backend
    uv run python ../scripts/seed.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.user import User  # noqa: E402


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Organization
        org = Organization(
            name="CurioAI Demo",
            slug="curio-demo",
            description="Demo organization for portfolio",
        )
        db.add(org)
        await db.flush()

        # Admin
        admin = User(
            organization_id=org.id,
            email="admin@curio.ai",
            full_name="Admin User",
            password_hash=hash_password("admin123"),
            role="ADMIN",
            status="ACTIVE",
        )
        db.add(admin)

        # Manager
        manager = User(
            organization_id=org.id,
            email="manager@curio.ai",
            full_name="Manager User",
            password_hash=hash_password("manager123"),
            role="MANAGER",
            status="ACTIVE",
        )
        db.add(manager)

        await db.commit()

        print("Seeded successfully!")
        print(f"  Organization: {org.name} ({org.slug})")
        print(f"  Admin:   admin@curio.ai / admin123")
        print(f"  Manager: manager@curio.ai / manager123")


if __name__ == "__main__":
    asyncio.run(seed())
