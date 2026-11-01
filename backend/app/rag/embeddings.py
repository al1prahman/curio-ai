from app.core.config import settings


class EmbeddingService:
    """Provider-agnostic embedding service.

    Local: sentence-transformers (no API key needed)
    API: OpenAI/Gemini compatible (set EMBEDDING_PROVIDER + EMBEDDING_API_KEY)
    """

    def __init__(self) -> None:
        self._provider = settings.EMBEDDING_PROVIDER
        self._model_name = settings.EMBEDDING_MODEL
        self._local_model = None
        self._dimension: int | None = None

    def _get_local_model(self):
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer

            self._local_model = SentenceTransformer(self._model_name)
            self._dimension = self._local_model.get_sentence_embedding_dimension()
        return self._local_model

    @property
    def dimension(self) -> int:
        if self._dimension is None:
            if self._provider == "local":
                self._get_local_model()
            else:
                # Default dimensions for common API models
                self._dimension = 1536
        return self._dimension

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if self._provider == "local":
            model = self._get_local_model()
            embeddings = model.encode(texts, show_progress_bar=False)
            return [e.tolist() for e in embeddings]
        return self._embed_api(texts)

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query])[0]

    def _embed_api(self, texts: list[str]) -> list[list[float]]:
        import httpx

        base_url = settings.EMBEDDING_BASE_URL or "https://api.openai.com/v1"
        model = self._model_name

        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{base_url}/embeddings",
                headers={"Authorization": f"Bearer {settings.EMBEDDING_API_KEY}"},
                json={"input": texts, "model": model},
            )
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]
