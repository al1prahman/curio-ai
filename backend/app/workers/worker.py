"""ARQ worker entrypoint.

Run from the backend/ directory:
    uv run arq app.workers.worker.WorkerSettings

A plain class is the settings object arq's CLI expects (it reads attributes
via getattr); no arq import needed here.
"""

from app.workers.document_jobs import process_document_job
from app.workers.queue import _redis_settings


class WorkerSettings:
    functions = [process_document_job]
    redis_settings = _redis_settings()
    max_jobs = 4
    job_timeout = 600  # large PDFs: extraction + embedding can take minutes
    max_tries = 1  # document-level failures are retried explicitly by admin
    keep_result = 60
