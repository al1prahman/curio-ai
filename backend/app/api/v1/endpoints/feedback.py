import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import DbSession, require_permission
from app.models.user import User
from app.services.feedback import get_message_feedback, list_feedback, submit_feedback

router = APIRouter(tags=["Feedback"])


class FeedbackSubmit(BaseModel):
    rating: str  # THUMBS_UP or THUMBS_DOWN
    comment: str | None = None


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    message_id: uuid.UUID
    rating: str
    comment: str | None = None

    model_config = {"from_attributes": True}


@router.post(
    "/chat/messages/{message_id}/feedback",
    response_model=FeedbackResponse,
    status_code=201,
)
async def submit_message_feedback(
    message_id: uuid.UUID,
    data: FeedbackSubmit,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.use"))],
) -> FeedbackResponse:
    feedback = await submit_feedback(
        db, message_id, current_user.id, data.rating, data.comment
    )
    return FeedbackResponse.model_validate(feedback)


@router.get("/chat/messages/{message_id}/feedback", response_model=FeedbackResponse | None)
async def get_feedback(
    message_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.view_own"))],
) -> FeedbackResponse | None:
    feedback = await get_message_feedback(db, message_id)
    if feedback is None:
        return None
    return FeedbackResponse.model_validate(feedback)


@router.get("/admin/feedback")
async def get_all_feedback(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("analytics.view"))],
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    items = await list_feedback(db, current_user.organization_id, limit)
    return {"items": items}
