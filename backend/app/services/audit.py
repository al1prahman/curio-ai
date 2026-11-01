import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_action(
    db: AsyncSession,
    organization_id: uuid.UUID,
    action: str,
    actor_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Record an audit log entry."""
    entry = AuditLog(
        organization_id=organization_id,
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        extra_metadata=metadata,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.commit()
    return entry
