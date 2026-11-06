"""E2E smoke: the "Buku Kancil" restricted-access scenario against a live stack.

Proves the permission model v2 end-to-end:
  1. admin uploads two documents
  2. the ARQ worker processes both (auto-enqueued on upload)
  3. admin restricts document 1 (visibility=RESTRICTED)
  4. the employee cannot see it in the document list
  5. the employee's chat cannot retrieve it (enforced at Qdrant filter level)
  6. the admin still sees everything

Prerequisites:
  - infra up:        docker compose up -d
  - backend:         cd backend && uv run uvicorn app.main:app --port 8000
  - worker:          cd backend && uv run arq app.workers.worker.WorkerSettings
  - seeded users:    uv run python ../scripts/seed.py

Usage:
  cd backend && uv run python ../scripts/e2e_kancil.py
  BASE_URL=http://127.0.0.1:8000/api/v1 uv run python ../scripts/e2e_kancil.py

Exit code 0 = scenario passed. Any assertion failure exits non-zero.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8000/api/v1")
SCRATCH = Path(os.environ.get("TMPDIR", "/tmp"))


def call(method: str, path: str, body: dict | None = None, token: str | None = None):
    data = None
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def multipart_upload(path: str, filepath: Path, token: str):
    boundary = "----curioe2e"
    content = filepath.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="files"; filename="{filepath.name}"\r\n'
        f"Content-Type: text/plain\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        BASE + path,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def main() -> None:
    # 1. Admin login
    admin = call("POST", "/auth/login", {"email": "admin@curio.ai", "password": "admin123"})
    at = admin["access_token"]
    print("[1] admin login OK")

    # 2. Employee — create, or reuse if already exists
    try:
        call(
            "POST",
            "/users",
            {
                "email": "budi@curio.ai",
                "password": "budi12345",
                "full_name": "Budi Karyawan",
                "role": "EMPLOYEE",
            },
            token=at,
        )
        print("[2] employee budi@curio.ai created")
    except urllib.error.HTTPError as e:
        print(f"[2] employee create skipped ({e.code}) — reusing existing")

    # 3. Upload two documents (unique content per run — checksum dedup)
    k1 = SCRATCH / "kancil-1.txt"
    k2 = SCRATCH / "kancil-2.txt"
    run_id = str(int(time.time()))
    k1.write_text(f"Buku Kancil 1 (run {run_id}): Si Kancil menipu Buaya agar mau berbaris di sungai.")
    k2.write_text(f"Buku Kancil 2 (run {run_id}): Si Kancil menyeberang sungai di punggung Buaya dengan aman.")

    d1 = multipart_upload("/documents/upload", k1, at)["uploaded"][0]["id"]
    d2 = multipart_upload("/documents/upload", k2, at)["uploaded"][0]["id"]
    print(f"[3] uploaded: kancil-1={d1[:8]} kancil-2={d2[:8]}")

    # 4. Wait for the worker to process both.
    # Cold worker: the first jobs pay the embedding-model load (~90s), so the
    # window is generous — warm jobs finish in under a second.
    s1 = s2 = ""
    for _ in range(150):
        s1 = call("GET", f"/documents/{d1}/status", token=at)["processing_status"]
        s2 = call("GET", f"/documents/{d2}/status", token=at)["processing_status"]
        if s1 == "COMPLETED" and s2 == "COMPLETED":
            break
        time.sleep(2)
    print(f"[4] status: kancil-1={s1} kancil-2={s2}")
    assert s1 == "COMPLETED" and s2 == "COMPLETED", "processing tidak selesai"

    # 5. Admin restricts Kancil 1
    v = call("PATCH", f"/documents/{d1}/visibility", {"visibility": "RESTRICTED"}, token=at)
    print(f"[5] kancil-1 visibility -> {v['visibility']}")

    # 6. Employee login
    budi = call("POST", "/auth/login", {"email": "budi@curio.ai", "password": "budi12345"})
    bt = budi["access_token"]
    print("[6] employee login OK")

    # 7. Employee document list — restricted doc must not appear (check by ID)
    ids = [d["id"] for d in call("GET", "/documents", token=bt)["items"]]
    print(f"[7] employee sees {len(ids)} docs; restricted d1 visible? {d1 in ids}")
    assert d1 not in ids, "LEAK: employee sees restricted doc!"
    assert d2 in ids, "allowed doc missing from employee list"

    # 8. Employee chat — sources must not include the restricted doc
    conv = call("POST", "/chat/conversations", {"title": "E2E"}, token=bt)
    msg = call(
        "POST",
        f"/chat/conversations/{conv['id']}/messages",
        {"question": "apa isi buku kancil?"},
        token=bt,
    )
    src_ids = [s["document_id"] for s in msg["sources"]]
    print(f"[8] chat sources: {[s['document_name'] for s in msg['sources']]}")
    print(f"    answer: {msg['answer'][:120]}...")
    assert d1 not in src_ids, "LEAK: restricted doc in chat sources!"
    assert d2 in src_ids, "allowed doc missing from sources"

    # 9. Admin still sees everything
    admin_ids = [d["id"] for d in call("GET", "/documents", token=at)["items"]]
    assert d1 in admin_ids and d2 in admin_ids
    print(f"[9] admin sees all ({len(admin_ids)} docs incl. restricted d1)")

    print("\nE2E PASS — restricted doc invisible to employee at list AND retrieval level.")


if __name__ == "__main__":
    sys.exit(main())
