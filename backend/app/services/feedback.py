import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Message, MessageFeedback


async def submit_feedback(
    db: AsyncSession,
    message_id: uuid.UUID,
    user_id: uuid.UUID,
    rating: str,
    comment: str | None = None,
) -> MessageFeedback:
    """Submit or update feedback for a message."""
    if rating not in {"THUMBS_UP", "THUMBS_DOWN"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be THUMBS_UP or THUMBS_DOWN",
        )

    # Verify message exists and is an assistant message
    msg_result = await db.execute(select(Message).where(Message.id == message_id))
    message = msg_result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.role != "assistant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback can only be submitted for assistant messages",
        )

    # Check for existing feedback (upsert)
    existing = await db.execute(
        select(MessageFeedback).where(
            MessageFeedback.message_id == message_id,
            MessageFeedback.user_id == user_id,
        )
    )
    feedback = existing.scalar_one_or_none()

    if feedback is not None:
        feedback.rating = rating
        feedback.comment = comment
    else:
        feedback = MessageFeedback(
            message_id=message_id,
            user_id=user_id,
            rating=rating,
            comment=comment,
        )
        db.add(feedback)

    await db.commit()
    await db.refresh(feedback)
    return feedback


async def get_message_feedback(
    db: AsyncSession,
    message_id: uuid.UUID,
) -> MessageFeedback | None:
    result = await db.execute(
        select(MessageFeedback).where(MessageFeedback.message_id == message_id)
    )
    return result.scalar_one_or_none()


async def list_feedback(
    db: AsyncSession,
    organization_id: uuid.UUID,
    limit: int = 50,
) -> list[dict]:
    """List all feedback for admin review."""
    from app.models.conversation import Conversation

    result = await db.execute(
        select(MessageFeedback, Message.content, Conversation.organization_id)
        .join(Message, MessageFeedback.message_id == Message.id)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.organization_id == organization_id)
        .order_by(MessageFeedback.created_at.desc())
        .limit(limit)
    )

    items = []
    for feedback, content, _org in result.all():
        items.append(
            {
                "id": str(feedback.id),
                "message_id": str(feedback.message_id),
                "rating": feedback.rating,
                "comment": feedback.comment,
                "message_preview": content[:100],
                "created_at": feedback.created_at.isoformat(),
            }
        )
    return items
