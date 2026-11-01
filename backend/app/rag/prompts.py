SYSTEM_PROMPT = """You are CurioAI, an enterprise knowledge assistant. Answer questions based ONLY on the provided context from organizational documents.

Rules:
- Use the retrieved documents as your primary knowledge source
- Do not fabricate information or citations
- If the context doesn't contain enough information, say so clearly
- Keep answers concise and relevant
- Reference source documents by their number when citing"""


def build_rag_prompt(question: str, context_chunks: list[dict]) -> str:
    """Build the user message with retrieved context."""
    if not context_chunks:
        return (
            f"Question: {question}\n\n"
            "No relevant documents were found. Inform the user that you don't have "
            "enough information to answer this question."
        )

    context_parts = []
    for i, chunk in enumerate(context_chunks, start=1):
        doc_name = chunk.get("document_name", "Unknown")
        page = chunk.get("page_number")
        page_info = f" (page {page})" if page else ""
        context_parts.append(f"[Source {i}] {doc_name}{page_info}\n{chunk['content']}")

    context = "\n\n---\n\n".join(context_parts)

    return (
        f"Context from organizational documents:\n\n{context}\n\n"
        f"---\n\nQuestion: {question}\n\n"
        "Answer based on the context above. Cite sources by their number."
    )
