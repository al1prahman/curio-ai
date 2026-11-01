import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, require_permission
from app.models.user import User
from app.schemas.chat import (
    AskQuestionRequest,
    AskQuestionResponse,
    ConversationCreate,
    ConversationRename,
    ConversationResponse,
    MessageResponse,
)
from app.services.chat import (
    ask_question,
    create_conversation,
    delete_conversation,
    get_conversation,
    get_messages,
    list_conversations,
    rename_conversation,
)

router = APIRouter(prefix="/chat", tags=["AI Chat"])


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_new_conversation(
    data: ConversationCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.use"))],
) -> ConversationResponse:
    conv = await create_conversation(db, current_user.organization_id, current_user.id, data.title)
    return ConversationResponse.model_validate(conv)


@router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.view_own"))],
) -> list[ConversationResponse]:
    convs = await list_conversations(db, current_user.id, current_user.organization_id)
    return [ConversationResponse.model_validate(c) for c in convs]


@router.get("/conversations/{conversation_id}", response_model=list[MessageResponse])
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.view_own"))],
) -> list[MessageResponse]:
    conv = await get_conversation(db, conversation_id, current_user.id, current_user.organization_id)
    messages = await get_messages(db, conv.id)
    return [MessageResponse.model_validate(m) for m in messages]


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def rename_conversation_endpoint(
    conversation_id: uuid.UUID,
    data: ConversationRename,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.view_own"))],
) -> ConversationResponse:
    conv = await get_conversation(db, conversation_id, current_user.id, current_user.organization_id)
    conv = await rename_conversation(db, conv, data.title)
    return ConversationResponse.model_validate(conv)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation_endpoint(
    conversation_id: uuid.UUID,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.view_own"))],
) -> None:
    conv = await get_conversation(db, conversation_id, current_user.id, current_user.organization_id)
    await delete_conversation(db, conv)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=AskQuestionResponse,
)
async def ask_question_endpoint(
    conversation_id: uuid.UUID,
    data: AskQuestionRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(require_permission("chat.use"))],
) -> AskQuestionResponse:
    conv = await get_conversation(db, conversation_id, current_user.id, current_user.organization_id)
    result = await ask_question(
        db, conv.id, current_user.id, current_user.organization_id, data.question
    )
    return AskQuestionResponse(**result)
