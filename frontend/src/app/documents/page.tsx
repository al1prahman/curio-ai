"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, getToken, type Document } from "@/lib/api";

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const data = await api.get<{ items: Document[]; total: number }>(
        `/documents?${params}`
      );
      setDocuments(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, router]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      await api.upload("/documents/upload", formData);
      await loadDocuments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleProcess(id: string) {
    await api.post(`/documents/${id}/process`);
    await loadDocuments();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await api.delete(`/documents/${id}`);
    await loadDocuments();
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-warning/10 text-warning",
    PROCESSING: "bg-primary/10 text-primary",
    COMPLETED: "bg-success/10 text-success",
    FAILED: "bg-danger/10 text-danger",
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-full w-60 bg-surface border-r border-border p-4">
        <h2 className="text-lg font-semibold text-text-primary mb-6">CurioAI</h2>
        <nav className="space-y-1">
          {[
            { href: "/dashboard", label: "Dashboard", icon: "📊" },
            { href: "/documents", label: "Documents", icon: "📄" },
            { href: "/collections", label: "Collections", icon: "📁" },
            { href: "/chat", label: "AI Chat", icon: "💬" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <main className="ml-60 p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Documents</h1>
            <p className="text-text-secondary mt-1">{total} documents</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors cursor-pointer inline-block"
            >
              {uploading ? "Uploading..." : "Upload Documents"}
            </label>
          </div>
        </header>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-surface text-sm w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-surface text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-text-secondary">Name</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Size</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Uploaded</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    Loading...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    No documents found. Upload some to get started.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-primary">{doc.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatSize(doc.file_size)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[doc.processing_status] || "bg-background text-text-secondary"
                        }`}
                      >
                        {doc.processing_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {doc.processing_status === "PENDING" && (
                          <button
                            onClick={() => handleProcess(doc.id)}
                            className="text-primary hover:underline text-xs"
                          >
                            Process
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-danger hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex gap-2 mt-4 justify-center">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 text-sm border border-border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-text-secondary">Page {page}</span>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 text-sm border border-border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
