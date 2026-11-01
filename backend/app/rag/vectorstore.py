import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.config import settings


def _strip_scheme(url: str) -> str:
    return url.replace("http://", "").replace("https://", "")

class VectorStore:
    """Qdrant vector store with org/document metadata filtering."""

    COLLECTION_NAME = "curio_chunks"

    def __init__(self) -> None:
        self._client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
        )
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        from app.rag.embeddings import EmbeddingService

        dim = EmbeddingService().dimension
        collections = self._client.get_collections().collections
        exists = any(c.name == self.COLLECTION_NAME for c in collections)

        if not exists:
            self._client.create_collection(
                collection_name=self.COLLECTION_NAME,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )

    def upsert_chunks(
        self,
        chunks: list[dict],
    ) -> None:
        """Upsert chunks. Each chunk: {id, vector, organization_id, document_id, chunk_index, page_number, content}"""
        points = [
            PointStruct(
                id=chunk["id"],
                vector=chunk["vector"],
                payload={
                    "organization_id": str(chunk["organization_id"]),
                    "document_id": str(chunk["document_id"]),
                    "chunk_index": chunk["chunk_index"],
                    "page_number": chunk.get("page_number"),
                    "content": chunk["content"],
                },
            )
            for chunk in chunks
        ]
        self._client.upsert(collection_name=self.COLLECTION_NAME, points=points)

    def search(
        self,
        query_vector: list[float],
        organization_id: uuid.UUID,
        top_k: int = 5,
        score_threshold: float = 0.0,
        document_ids: list[uuid.UUID] | None = None,
    ) -> list[dict]:
        must_conditions = [
            FieldCondition(key="organization_id", match=MatchValue(value=str(organization_id)))
        ]

        if document_ids:
            must_conditions.append(
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=[str(d) for d in document_ids]),
                )
            )

        results = self._client.query_points(
            collection_name=self.COLLECTION_NAME,
            query=query_vector,
            query_filter=Filter(must=must_conditions),
            limit=top_k,
            score_threshold=score_threshold,
        ).points
        return [
            {
                "id": hit.id,
                "score": hit.score,
                "document_id": hit.payload.get("document_id"),
                "chunk_index": hit.payload.get("chunk_index"),
                "page_number": hit.payload.get("page_number"),
                "content": hit.payload.get("content"),
            }
            for hit in results
        ]

    def delete_document(self, document_id: uuid.UUID) -> None:
        self._client.delete(
            collection_name=self.COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=str(document_id)),
                    )
                ]
            ),
        )
