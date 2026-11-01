from datetime import UTC
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.deps import DbSession, require_permission
from app.models.audit import AuditLog
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("analytics.view"))],
) -> dict[str, Any]:
    """Dashboard statistics for the current organization."""
    from app.services.redis_service import cache_get, cache_set

    # Try cache first
    cache_key = f"analytics:overview:{current_user.organization_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return dict(cached)

    org_id = current_user.organization_id

    doc_result = await db.execute(
        select(Document.processing_status, func.count())
        .where(Document.organization_id == org_id, Document.deleted_at.is_(None))
        .group_by(Document.processing_status)
    )
    doc_counts = {status: count for status, count in doc_result.all()}

    user_result = await db.execute(
        select(func.count()).select_from(User).where(User.organization_id == org_id)
    )
    total_users = user_result.scalar_one()

    conv_result = await db.execute(
        select(func.count()).select_from(Conversation).where(Conversation.organization_id == org_id)
    )
    total_conversations = conv_result.scalar_one()

    msg_result = await db.execute(
        select(func.count())
        .select_from(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.organization_id == org_id)
    )
    total_messages = msg_result.scalar_one()

    total_documents = sum(doc_counts.values())

    result = {
        "total_documents": total_documents,
        "completed_documents": doc_counts.get("COMPLETED", 0),
        "pending_documents": doc_counts.get("PENDING", 0),
        "processing_documents": doc_counts.get("PROCESSING", 0),
        "failed_documents": doc_counts.get("FAILED", 0),
        "total_users": total_users,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
    }

    # Cache for 60 seconds
    await cache_set(cache_key, result, ttl_seconds=60)
    return result


@router.get("/usage")
async def get_usage(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("analytics.view"))],
    days: int = Query(7, ge=1, le=90),
) -> dict[str, Any]:
    """AI usage metrics over the last N days."""
    from datetime import datetime, timedelta

    org_id = current_user.organization_id
    since = datetime.now(UTC) - timedelta(days=days)

    msg_result = await db.execute(
        select(
            func.date(Message.created_at).label("date"),
            func.count().label("count"),
        )
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(
            Conversation.organization_id == org_id,
            Message.created_at >= since,
            Message.role == "assistant",
        )
        .group_by(func.date(Message.created_at))
        .order_by(func.date(Message.created_at))
    )
    daily = [{"date": str(row.date), "count": row.count} for row in msg_result.all()]

    token_result = await db.execute(
        select(
            func.coalesce(func.sum(Message.input_tokens), 0).label("input_tokens"),
            func.coalesce(func.sum(Message.output_tokens), 0).label("output_tokens"),
        )
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.organization_id == org_id, Message.created_at >= since)
    )
    token_row = token_result.one()

    return {
        "period_days": days,
        "daily_messages": daily,
        "total_input_tokens": token_row.input_tokens,
        "total_output_tokens": token_row.output_tokens,
    }


@router.get("/activity")
async def get_activity(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("analytics.view"))],
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    """Recent activity from audit logs for this organization."""
    org_id = current_user.organization_id

    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.organization_id == org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()

    return {
        "items": [
            {
                "id": str(log.id),
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": str(log.resource_id) if log.resource_id else None,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]
    }
