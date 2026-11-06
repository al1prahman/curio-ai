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

from sqlalchemy import select  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.user import User  # noqa: E402


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Idempotent: skip if the demo org already exists
        existing = await db.execute(
            select(Organization).where(Organization.slug == "curio-demo")
        )
        if existing.scalar_one_or_none() is not None:
            print("Demo org already seeded — skipping.")
            return

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

        # Employee — for testing the restricted-access flow
        employee = User(
            organization_id=org.id,
            email="budi@curio.ai",
            full_name="Budi Karyawan",
            password_hash=hash_password("budi12345"),
            role="EMPLOYEE",
            status="ACTIVE",
        )
        db.add(employee)

        await db.commit()

        print("Seeded successfully!")
        print(f"  Organization: {org.name} ({org.slug})")
        print("  Admin:     admin@curio.ai / admin123")
        print("  Manager:   manager@curio.ai / manager123")
        print("  Employee:  budi@curio.ai / budi12345")


if __name__ == "__main__":
    asyncio.run(seed())
