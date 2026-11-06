"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { api, getToken, type Document, type User } from "@/lib/api";
import AppShell from "@/components/AppShell";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  InlineAlert,
  LoadingState,
  Select,
  Switch,
} from "@/components/ui";

const STATUS_TONES: Record<string, "neutral" | "warn" | "accent" | "ok" | "bad"> = {
  PENDING: "warn",
  QUEUED: "warn",
  PROCESSING: "accent",
  COMPLETED: "ok",
  FAILED: "bad",
};

const PERMISSION_TONES: Record<string, "neutral" | "ok" | "accent"> = {
  READ: "neutral",
  WRITE: "ok",
  MANAGE: "accent",
};

interface Permission {
  id: string;
  document_id: string;
  user_id: string | null;
  role: string | null;
  permission: string;
}

const MANAGER_ROLES = new Set(["ADMIN", "MANAGER"]);

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [doc, setDoc] = useState<Document | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [self, setSelf] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [permError, setPermError] = useState("");

  const [grantType, setGrantType] = useState<"user" | "role">("user");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantRole, setGrantRole] = useState("EMPLOYEE");
  const [grantPermission, setGrantPermission] = useState("READ");
  const [granting, setGranting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const canManage = self !== null && MANAGER_ROLES.has(self.role);

  const loadDoc = useCallback(async () => {
    const data = await api.get<Document>(`/documents/${id}`);
    setDoc(data);
    return data;
  }, [id]);

  const loadPerms = useCallback(async () => {
    const data = await api.get<Permission[]>(`/documents/${id}/permissions`);
    setPerms(data);
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, me] = await Promise.all([
          loadDoc(),
          api.get<User>("/auth/me"),
        ]);
        setSelf(me);
        if (MANAGER_ROLES.has(me.role)) {
          const [u] = await Promise.all([
            api.get<{ items: User[] }>("/users?page_size=100"),
            loadPerms(),
          ]);
          setUsers(u.items);
        }
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadDoc, loadPerms]);

  // Live status poll while the worker chews on it
  useEffect(() => {
    if (!doc) return;
    if (doc.processing_status !== "QUEUED" && doc.processing_status !== "PROCESSING") {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const s = await api.get<{ processing_status: string; processing_error: string | null }>(
          `/documents/${id}/status`
        );
        if (s.processing_status !== "QUEUED" && s.processing_status !== "PROCESSING") {
          await loadDoc();
        }
      } catch {
        /* transient — next tick retries */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [doc, id, loadDoc]);

  async function toggleVisibility(next: boolean) {
    if (!doc) return;
    try {
      const updated = await api.patch<Document>(`/documents/${id}/visibility`, {
        visibility: next ? "ALL_EMPLOYEES" : "RESTRICTED",
      });
      setDoc(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal update visibility");
    }
  }

  async function addGrant(e: React.FormEvent) {
    e.preventDefault();
    setGranting(true);
    setPermError("");
    try {
      await api.post(`/documents/${id}/permissions`, {
        user_id: grantType === "user" ? grantUserId : null,
        role: grantType === "role" ? grantRole : null,
        permission: grantPermission,
      });
      setGrantUserId("");
      await loadPerms();
    } catch (err) {
      setPermError(err instanceof Error ? err.message : "Gagal menambah grant");
    } finally {
      setGranting(false);
    }
  }

  async function revokeGrant(permId: string) {
    try {
      await api.delete(`/documents/${id}/permissions/${permId}`);
      await loadPerms();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal revoke grant");
    }
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      const updated = await api.post<Document>(`/documents/${id}/process`);
      setDoc(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal enqueue processing");
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/documents/${id}`);
      router.push("/documents");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal hapus dokumen");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleDownload() {
    const token = getToken();
    const res = await fetch(`/api/v1/documents/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      alert("Download gagal");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc?.original_filename ?? "document";
    a.click();
    URL.revokeObjectURL(url);
  }

  function userName(userId: string | null) {
    if (!userId) return null;
    const u = users.find((x) => x.id === userId);
    return u ? `${u.full_name} (${u.email})` : userId;
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 max-w-3xl">
          <Card>
            <LoadingState label="Loading document" />
          </Card>
        </div>
      </AppShell>
    );
  }

  if (error || !doc) {
    return (
      <AppShell>
        <div className="p-6 max-w-3xl">
          <Card>
            <ErrorState
              message={error || "Document not found"}
              onRetry={() => router.push("/documents")}
            />
          </Card>
        </div>
      </AppShell>
    );
  }

  const restricted = doc.visibility === "RESTRICTED";

  return (
    <AppShell>
      <div className="p-6 max-w-3xl">
        {/* Back + header */}
        <a
          href="/documents"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink mb-4"
        >
          <ArrowLeft size={13} strokeWidth={1.75} />
          Documents
        </a>

        <header className="flex items-start justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-ink tracking-tight truncate">
              {doc.name}
            </h1>
            <div className="flex gap-1.5 mt-1.5">
              <Badge tone={STATUS_TONES[doc.processing_status] ?? "neutral"}>
                {doc.processing_status}
              </Badge>
              <Badge tone={restricted ? "warn" : "ok"}>
                {restricted ? "RESTRICTED" : "ALL EMPLOYEES"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="default" size="sm" onClick={handleDownload}>
              <Download size={13} strokeWidth={2} />
              Download
            </Button>
            {(doc.processing_status === "PENDING" || doc.processing_status === "FAILED") && (
              <Button variant="default" size="sm" disabled={processing} onClick={handleProcess}>
                {processing ? "Queueing" : "Reprocess"}
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={13} strokeWidth={2} />
              Delete
            </Button>
          </div>
        </header>

        {doc.processing_status === "FAILED" && doc.processing_error && (
          <div className="mb-4">
            <InlineAlert tone="bad">
              Processing gagal: {doc.processing_error}
            </InlineAlert>
          </div>
        )}

        {/* File info */}
        <Card className="p-4 mb-4">
          <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[13px]">
            <div>
              <dt className="text-ink-3 text-[12px]">File</dt>
              <dd className="text-ink">{doc.original_filename}</dd>
            </div>
            <div>
              <dt className="text-ink-3 text-[12px]">Size</dt>
              <dd className="text-ink tabular">{formatSize(doc.file_size)}</dd>
            </div>
            <div>
              <dt className="text-ink-3 text-[12px]">Pages</dt>
              <dd className="text-ink tabular">{doc.page_count ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-3 text-[12px]">Uploaded</dt>
              <dd className="text-ink">
                {new Date(doc.created_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Access control */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Access control</h2>

          {/* Visibility */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-line">
            <div>
              <p className="text-[13px] font-medium text-ink">
                Visible to all employees
              </p>
              <p className="text-[12px] text-ink-2 mt-0.5 leading-relaxed max-w-md">
                Default: semua karyawan bisa akses dokumen ini. Matikan untuk
                menyembunyikannya — hanya grant di bawah yang tetap bisa akses.
              </p>
            </div>
            {canManage ? (
              <Switch
                checked={!restricted}
                onChange={toggleVisibility}
                label="Visible to all employees"
              />
            ) : (
              <Badge tone={restricted ? "warn" : "ok"}>
                {restricted ? "RESTRICTED" : "ALL EMPLOYEES"}
              </Badge>
            )}
          </div>

          {/* Grants */}
          <div className="pt-4">
            <p className="text-[13px] font-medium text-ink mb-2">
              Explicit grants
            </p>

            {perms.length === 0 ? (
              <p className="text-[12px] text-ink-2 leading-relaxed mb-4">
                {restricted
                  ? "Tidak ada grant — dokumen ini disembunyikan dari semua karyawan."
                  : "Tidak ada grant khusus — semua karyawan sudah bisa akses."}
              </p>
            ) : (
              <table className="w-full text-[13px] mb-4">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left font-medium text-ink-2 text-[12px] px-2 h-8 first:pl-0">
                      Who
                    </th>
                    <th className="text-left font-medium text-ink-2 text-[12px] px-2 h-8 w-28">
                      Level
                    </th>
                    {canManage && <th className="w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {perms.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-2 h-9 first:pl-0 text-ink">
                        {p.user_id ? (
                          userName(p.user_id)
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge tone="neutral">ROLE</Badge>
                            {p.role}
                          </span>
                        )}
                      </td>
                      <td className="px-2 h-9">
                        <Badge tone={PERMISSION_TONES[p.permission] ?? "neutral"}>
                          {p.permission}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="px-2 h-9 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => revokeGrant(p.id)}
                          >
                            Revoke
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add grant */}
            {canManage && (
              <form onSubmit={addGrant} className="space-y-2.5">
                {permError && <InlineAlert tone="bad">{permError}</InlineAlert>}
                <div className="flex gap-2 items-end">
                  <div className="w-32">
                    <Select
                      label="Type"
                      value={grantType}
                      onChange={(e) => setGrantType(e.target.value as "user" | "role")}
                      options={[
                        { value: "user", label: "User" },
                        { value: "role", label: "Role" },
                      ]}
                    />
                  </div>
                  {grantType === "user" ? (
                    <div className="flex-1">
                      <Select
                        label="User"
                        value={grantUserId}
                        onChange={(e) => setGrantUserId(e.target.value)}
                        options={[
                          { value: "", label: "Pilih user" },
                          ...users.map((u) => ({
                            value: u.id,
                            label: `${u.full_name} (${u.email})`,
                          })),
                        ]}
                        required
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <Select
                        label="Role"
                        value={grantRole}
                        onChange={(e) => setGrantRole(e.target.value)}
                        options={[
                          { value: "EMPLOYEE", label: "Employee" },
                          { value: "MANAGER", label: "Manager" },
                          { value: "ADMIN", label: "Admin" },
                        ]}
                      />
                    </div>
                  )}
                  <div className="w-32">
                    <Select
                      label="Level"
                      value={grantPermission}
                      onChange={(e) => setGrantPermission(e.target.value)}
                      options={[
                        { value: "READ", label: "Read" },
                        { value: "WRITE", label: "Write" },
                        { value: "MANAGE", label: "Manage" },
                      ]}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={granting || (grantType === "user" && !grantUserId)}
                  >
                    {granting ? "Adding" : "Add grant"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete document"
        message={`"${doc.name}" akan dihapus beserta semua chunk-nya. Aksi ini tidak bisa dibatalkan.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </AppShell>
  );
}
