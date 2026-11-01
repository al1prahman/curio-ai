SYSTEM_PROMPT = """You are CurioAI, an enterprise knowledge assistant. Answer questions based ONLY on the provided context from organizational documents and the recent conversation history.

Rules:
- Use the retrieved documents as your primary knowledge source
- Use conversation history to understand follow-up questions and pronouns
- Do not fabricate information or citations
- If the context doesn't contain enough information, say so clearly
- Keep answers concise and relevant
- Reference source documents by their number when citing"""


def build_rag_prompt(
    question: str,
    context_chunks: list[dict],
    recent_messages: list | None = None,
) -> str:
    """Build the user message with retrieved context and conversation history."""
    parts = []

    # Conversation history
    if recent_messages:
        history_lines = []
        for msg in recent_messages:
            role = "User" if msg.role == "user" else "Assistant"
            content = msg.content[:300]
            history_lines.append(f"{role}: {content}")
        if history_lines:
            parts.append("Recent conversation:\n" + "\n".join(history_lines))

    # Retrieved context
    if context_chunks:
        context_parts = []
        for i, chunk in enumerate(context_chunks, start=1):
            doc_name = chunk.get("document_name", "Unknown")
            page = chunk.get("page_number")
            page_info = f" (page {page})" if page else ""
            context_parts.append(f"[Source {i}] {doc_name}{page_info}\n{chunk['content']}")
        parts.append("Context from documents:\n\n" + "\n\n---\n\n".join(context_parts))
    else:
        parts.append(
            "No relevant documents were found. Inform the user that you don't have "
            "enough information to answer this question."
        )

    parts.append(f"Question: {question}")

    if context_chunks:
        parts.append("Answer based on the context above. Cite sources by their number.")

    return "\n\n".join(parts)
