"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Upload } from "lucide-react";
import { api, type Document } from "@/lib/api";
import AppShell from "@/components/AppShell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

const STATUS_TONES: Record<string, "neutral" | "warn" | "accent" | "ok" | "bad"> = {
  PENDING: "warn",
  PROCESSING: "accent",
  COMPLETED: "ok",
  FAILED: "bad",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const data = await api.get<{ items: Document[]; total: number }>(
        `/documents?${params}`
      );
      setDocuments(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
      const result = await api.upload<{
        uploaded: Document[];
        skipped: { filename: string; reason: string }[];
      }>("/documents/upload", formData);

      if (result.skipped.length > 0) {
        alert(
          `Skipped:\n${result.skipped.map((s) => `- ${s.filename}: ${s.reason}`).join("\n")}`
        );
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleProcess(id: string) {
    await api.post(`/documents/${id}/process`);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await api.delete(`/documents/${id}`);
    await load();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl">
        <PageHeader
          title="Documents"
          description={`${total} document${total !== 1 ? "s" : ""} in your knowledge base`}
          actions={
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-1.5 h-8 px-3 bg-ink text-white text-[13px] font-medium rounded-ctrl hover:bg-ink/90 transition-colors cursor-pointer"
              >
                <Upload size={13} strokeWidth={2} />
                {uploading ? "Uploading" : "Upload"}
              </label>
            </>
          }
        />

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              placeholder="Search by name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 pr-3 w-56 rounded-ctrl border border-line bg-surface text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2 rounded-ctrl border border-line bg-surface text-[13px] text-ink focus:outline-none focus:border-accent"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Table */}
        {error ? (
          <Card>
            <ErrorState message={error} onRetry={load} />
          </Card>
        ) : loading ? (
          <Card>
            <LoadingState label="Loading documents" />
          </Card>
        ) : documents.length === 0 ? (
          <Card>
            <EmptyState
              title="No documents yet"
              description="Upload a PDF, DOCX, or TXT file to build your knowledge base."
              action={
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-1.5 h-8 px-3 bg-ink text-white text-[13px] font-medium rounded-ctrl hover:bg-ink/90 transition-colors cursor-pointer"
                >
                  <Upload size={13} strokeWidth={2} />
                  Upload your first document
                </label>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9">Name</th>
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9 w-20">Size</th>
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9 w-28">Status</th>
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9 w-28">Uploaded</th>
                  <th className="text-right font-medium text-ink-2 text-[12px] px-4 h-9 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-line last:border-0 hover:bg-sunken/50 transition-colors"
                  >
                    <td className="px-4 h-10 text-ink">
                      <a
                        href={`/documents/${doc.id}`}
                        className="hover:text-accent hover:underline"
                      >
                        {doc.name}
                      </a>
                    </td>
                    <td className="px-4 h-10 text-ink-2 tabular">{formatSize(doc.file_size)}</td>
                    <td className="px-4 h-10">
                      <Badge tone={STATUS_TONES[doc.processing_status] ?? "neutral"}>
                        {doc.processing_status}
                      </Badge>
                    </td>
                    <td className="px-4 h-10 text-ink-2">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 h-10 text-right">
                      <div className="flex gap-1 justify-end">
                        {doc.processing_status === "PENDING" && (
                          <Button variant="ghost" size="sm" onClick={() => handleProcess(doc.id)}>
                            Process
                          </Button>
                        )}
                        <Button variant="danger" size="sm" onClick={() => handleDelete(doc.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex gap-2 mt-3 justify-center">
            <Button variant="default" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="px-3 py-1 text-[12px] text-ink-2">Page {page}</span>
            <Button
              variant="default"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
