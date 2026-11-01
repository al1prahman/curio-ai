import hashlib
import io
import uuid

import minio

from app.core.config import settings


def _strip_scheme(url: str) -> str:
    return url.replace("http://", "").replace("https://", "")


class StorageService:
    """S3-compatible object storage via MinIO."""

    def __init__(self) -> None:
        self._client = minio.Minio(
            endpoint=_strip_scheme(settings.OBJECT_STORAGE_ENDPOINT),
            access_key=settings.OBJECT_STORAGE_ACCESS_KEY,
            secret_key=settings.OBJECT_STORAGE_SECRET_KEY,
            secure=settings.OBJECT_STORAGE_ENDPOINT.startswith("https"),
        )
        self._bucket = settings.OBJECT_STORAGE_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)

    def upload(self, data: bytes, filename: str, content_type: str) -> str:
        """Upload file, return storage key."""
        key = f"{uuid.uuid4()}/{filename}"
        self._client.put_object(
            bucket_name=self._bucket,
            object_name=key,
            data=io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return key

    def download(self, storage_key: str) -> bytes:
        response = self._client.get_object(self._bucket, storage_key)
        try:
            data: bytes = response.read()
            return data
        finally:
            response.close()
            response.release_conn()

    def delete(self, storage_key: str) -> None:
        self._client.remove_object(self._bucket, storage_key)


def compute_checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_FILES_PER_REQUEST = 10
