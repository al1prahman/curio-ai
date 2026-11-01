import uuid


class Chunk:
    def __init__(
        self,
        content: str,
        chunk_index: int,
        page_number: int | None = None,
        token_count: int | None = None,
    ) -> None:
        self.id = str(uuid.uuid4())
        self.content = content
        self.chunk_index = chunk_index
        self.page_number = page_number
        self.token_count = token_count


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
    page_number: int | None = None,
) -> list[Chunk]:
    """Recursive character-aware chunking with overlap.

    Splits on paragraph boundaries first, then sentences, then words.
    """
    if not text.strip():
        return []

    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks: list[Chunk] = []
    current = ""
    current_start_page = page_number

    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para

        if len(candidate) <= chunk_size:
            current = candidate
        else:
            # Flush current buffer
            if current.strip():
                chunks.append(
                    Chunk(
                        content=current.strip(),
                        chunk_index=len(chunks),
                        page_number=current_start_page,
                        token_count=_estimate_tokens(current),
                    )
                )

            # If paragraph itself is too long, split by sentences
            if len(para) > chunk_size:
                sentences = _split_sentences(para)
                current = ""
                for sent in sentences:
                    candidate = f"{current} {sent}" if current else sent
                    if len(candidate) <= chunk_size:
                        current = candidate
                    else:
                        if current.strip():
                            chunks.append(
                                Chunk(
                                    content=current.strip(),
                                    chunk_index=len(chunks),
                                    page_number=current_start_page,
                                    token_count=_estimate_tokens(current),
                                )
                            )
                        # Overlap: keep last chunk_overlap chars
                        overlap_text = current[-chunk_overlap:] if current else ""
                        current = f"{overlap_text} {sent}".strip()
                current_start_page = page_number
            else:
                # Overlap from previous chunk
                overlap_text = current[-chunk_overlap:] if current else ""
                current = f"{overlap_text}\n\n{para}".strip()
                current_start_page = page_number

    # Flush remaining
    if current.strip():
        chunks.append(
            Chunk(
                content=current.strip(),
                chunk_index=len(chunks),
                page_number=current_start_page,
                token_count=_estimate_tokens(current),
            )
        )

    return chunks


def _split_sentences(text: str) -> list[str]:
    import re

    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def _estimate_tokens(text: str) -> int:
    # Rough estimate: ~4 chars per token for English
    return max(1, len(text) // 4)
