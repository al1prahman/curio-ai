import io

from docx import Document as DocxDocument
from pypdf import PdfReader


class ExtractedPage:
    def __init__(self, text: str, page_number: int | None = None) -> None:
        self.text = text
        self.page_number = page_number


def extract_text(data: bytes, mime_type: str) -> list[ExtractedPage]:
    """Extract text from PDF, DOCX, or TXT. Returns list of pages."""
    if mime_type == "text/plain":
        text = data.decode("utf-8", errors="replace")
        return [ExtractedPage(text=text)]

    if mime_type == "application/pdf":
        return _extract_pdf(data)

    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return _extract_docx(data)

    raise ValueError(f"Unsupported mime type: {mime_type}")


def _extract_pdf(data: bytes) -> list[ExtractedPage]:
    reader = PdfReader(io.BytesIO(data))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(ExtractedPage(text=text, page_number=i))
    return pages


def _extract_docx(data: bytes) -> list[ExtractedPage]:
    doc = DocxDocument(io.BytesIO(data))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [ExtractedPage(text=full_text, page_number=None)]


def normalize_text(text: str) -> str:
    """Basic text normalization."""
    lines = (line.strip() for line in text.splitlines())
    non_empty = [line for line in lines if line]
    return "\n".join(non_empty)
