"""RAG pipeline unit tests (no DB/network required)."""

from app.rag.chunking import chunk_text
from app.rag.extraction import extract_text, normalize_text


class TestChunking:
    def test_basic_chunking(self):
        text = "This is paragraph one.\n\nThis is paragraph two.\n\nThis is paragraph three."
        chunks = chunk_text(text, chunk_size=50, chunk_overlap=10)
        assert len(chunks) >= 1
        assert all(c.content.strip() for c in chunks)

    def test_empty_text(self):
        chunks = chunk_text("", chunk_size=100)
        assert chunks == []

    def test_whitespace_only(self):
        chunks = chunk_text("   \n\n   \n", chunk_size=100)
        assert chunks == []

    def test_long_text_splits(self):
        text = ("A" * 200 + " ") * 20
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=20)
        assert len(chunks) > 1

    def test_chunk_indices_sequential(self):
        text = "Para one.\n\nPara two.\n\nPara three.\n\nPara four."
        chunks = chunk_text(text, chunk_size=30, chunk_overlap=5)
        for i, c in enumerate(chunks):
            assert c.chunk_index == i

    def test_page_number_preserved(self):
        chunks = chunk_text("Some text.", chunk_size=100, page_number=5)
        assert all(c.page_number == 5 for c in chunks)

    def test_token_count_estimated(self):
        chunks = chunk_text("Hello world.", chunk_size=100)
        assert all(c.token_count is not None and c.token_count > 0 for c in chunks)


class TestExtraction:
    def test_txt_extraction(self):
        data = b"Hello, this is a test document."
        pages = extract_text(data, "text/plain")
        assert len(pages) == 1
        assert "Hello" in pages[0].text

    def test_unsupported_type_raises(self):
        import pytest

        with pytest.raises(ValueError):
            extract_text(b"data", "image/png")

    def test_normalize_text(self):
        raw = "  Line 1  \n\n  Line 2  \n\n\n  Line 3  "
        result = normalize_text(raw)
        assert "Line 1" in result
        assert "Line 2" in result
        assert "Line 3" in result
        assert "  " not in result  # no double spaces

    def test_normalize_empty(self):
        assert normalize_text("") == ""
        assert normalize_text("   \n\n   ") == ""


class TestPrompts:
    def test_build_prompt_with_sources(self):
        from app.rag.prompts import build_rag_prompt

        chunks = [
            {"content": "Test content", "document_name": "doc.txt", "page_number": 1, "score": 0.9},
        ]
        prompt = build_rag_prompt("What is this?", chunks)
        assert "Test content" in prompt
        assert "doc.txt" in prompt
        assert "What is this?" in prompt
        assert "[Source 1]" in prompt

    def test_build_prompt_no_sources(self):
        from app.rag.prompts import build_rag_prompt

        prompt = build_rag_prompt("What is this?", [])
        assert "No relevant documents" in prompt

    def test_build_prompt_with_history(self):
        from app.rag.prompts import build_rag_prompt

        class FakeMsg:
            def __init__(self, role, content):
                self.role = role
                self.content = content

        history = [FakeMsg("user", "Previous question"), FakeMsg("assistant", "Previous answer")]
        chunks = [{"content": "ctx", "document_name": "d.txt", "page_number": None, "score": 0.8}]
        prompt = build_rag_prompt("Follow up?", chunks, history)
        assert "Recent conversation" in prompt
        assert "Previous question" in prompt
