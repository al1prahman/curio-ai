import time
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.conversation import Conversation, Message, MessageSource
from app.models.document import Document, DocumentChunk
from app.rag.embeddings import EmbeddingService
from app.rag.prompts import SYSTEM_PROMPT, build_rag_prompt
from app.rag.vectorstore import VectorStore
from app.services.llm import LLMService


async def create_conversation(
    db: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str = "New Conversation",
) -> Conversation:
    conv = Conversation(
        organization_id=organization_id,
        user_id=user_id,
        title=title,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def list_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.user_id == user_id,
            Conversation.organization_id == organization_id,
        )
        .order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.organization_id == organization_id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


async def get_messages(
    db: AsyncSession,
    conversation_id: uuid.UUID,
) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


async def rename_conversation(
    db: AsyncSession,
    conv: Conversation,
    title: str,
) -> Conversation:
    conv.title = title
    await db.commit()
    await db.refresh(conv)
    return conv


async def delete_conversation(db: AsyncSession, conv: Conversation) -> None:
    await db.delete(conv)
    await db.commit()


async def ask_question(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
    question: str,
) -> dict[str, Any]:
    """Full RAG chat flow: save Q -> retrieve -> generate -> save A + citations."""
    start_time = time.time()

    # 1. Save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=question,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # 2. Load recent conversation context (last 6 messages for memory)
    recent_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.id != user_msg.id)
        .order_by(Message.created_at.desc())
        .limit(6)
    )
    recent_messages = list(reversed(recent_result.scalars().all()))

    # 3. Embed query
    embedding_service = EmbeddingService()
    query_vector = embedding_service.embed_query(question)

    # 4. Retrieve relevant chunks (org-isolated)
    vector_store = VectorStore()
    chunks = vector_store.search(
        query_vector=query_vector,
        organization_id=organization_id,
        top_k=settings.RAG_TOP_K,
        score_threshold=settings.RAG_SIMILARITY_THRESHOLD,
    )

    # 5. Enrich chunks with document names + chunk PKs
    enriched = []
    for chunk in chunks:
        doc_result = await db.execute(
            select(Document.name).where(Document.id == chunk["document_id"])
        )
        doc_name = doc_result.scalar_one_or_none() or "Unknown"

        chunk_result = await db.execute(
            select(DocumentChunk.id).where(DocumentChunk.vector_id == str(chunk["id"]))
        )
        chunk_pk = chunk_result.scalar_one_or_none()

        enriched.append({**chunk, "document_name": doc_name, "chunk_pk": chunk_pk})

    # 6. Build prompt with conversation history + retrieved context
    llm = LLMService()
    prompt = build_rag_prompt(question, enriched, recent_messages)
    result = llm.generate(SYSTEM_PROMPT, prompt)

    latency_ms = int((time.time() - start_time) * 1000)

    # 6. Save assistant message
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=result["content"],
        model_name=settings.LLM_MODEL,
        input_tokens=result.get("input_tokens"),
        output_tokens=result.get("output_tokens"),
        latency_ms=latency_ms,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    # 7. Save source citations
    sources = []
    for _i, chunk in enumerate(enriched, start=1):
        if chunk.get("chunk_pk") is None:
            continue
        source = MessageSource(
            message_id=assistant_msg.id,
            document_id=uuid.UUID(chunk["document_id"]),
            chunk_id=chunk["chunk_pk"],
            page_number=chunk.get("page_number"),
            excerpt=chunk["content"][:500],
            relevance_score=chunk.get("score"),
        )
        db.add(source)
        sources.append(
            {
                "document_id": chunk["document_id"],
                "document_name": chunk.get("document_name"),
                "page_number": chunk.get("page_number"),
                "excerpt": chunk["content"][:500],
                "relevance_score": chunk.get("score"),
            }
        )

    await db.commit()

    return {
        "question": question,
        "answer": result["content"],
        "sources": sources,
        "model": settings.LLM_MODEL,
        "input_tokens": result.get("input_tokens"),
        "output_tokens": result.get("output_tokens"),
        "latency_ms": latency_ms,
    }
