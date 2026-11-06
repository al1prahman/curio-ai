"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { api, type User } from "@/lib/api";
import AppShell from "@/components/AppShell";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  InlineAlert,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
} from "@/components/ui";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Admin" },
];

const ROLE_TONES: Record<string, "neutral" | "ok" | "accent"> = {
  EMPLOYEE: "neutral",
  MANAGER: "ok",
  ADMIN: "accent",
};

interface CreateForm {
  full_name: string;
  email: string;
  password: string;
  role: string;
}

interface EditForm {
  full_name: string;
  role: string;
  status: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [self, setSelf] = useState<User | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    full_name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "",
    role: "EMPLOYEE",
    status: "ACTIVE",
  });
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (search) params.set("search", search);
      const data = await api.get<{ items: User[]; total: number }>(
        `/users?${params}`
      );
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get<User>("/auth/me").then(setSelf).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (createForm.password.length < 8) {
      setCreateError("Password minimal 8 karakter.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/users", createForm);
      setCreateOpen(false);
      setCreateForm({ full_name: "", email: "", password: "", role: "EMPLOYEE" });
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Gagal membuat user");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditForm({ full_name: u.full_name, role: u.role, status: u.status });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    try {
      await api.patch(`/users/${editTarget.id}`, editForm);
      setEditTarget(null);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal update user");
    } finally {
      setEditing(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      await api.delete(`/users/${deactivateTarget.id}`);
      setDeactivateTarget(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menonaktifkan user");
    }
  }

  function formatLastLogin(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl">
        <PageHeader
          title="Users"
          description={`${total} akun di organisasi kamu`}
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCreateError("");
                setCreateOpen(true);
              }}
            >
              <UserPlus size={13} strokeWidth={2} />
              Add user
            </Button>
          }
        />

        {/* Search */}
        <div className="flex gap-2 mb-3">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              type="text"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 pr-3 w-72 rounded-ctrl border border-line bg-surface text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Table */}
        {error ? (
          <Card>
            <ErrorState message={error} onRetry={load} />
          </Card>
        ) : loading ? (
          <Card>
            <LoadingState label="Loading users" />
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <EmptyState
              title={search ? "No users match your search" : "No users yet"}
              description={
                search
                  ? "Coba kata kunci lain."
                  : "Buat akun karyawan manual — mereka login pakai email & password yang kamu kasih."
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setCreateError("");
                    setCreateOpen(true);
                  }}
                >
                  <UserPlus size={13} strokeWidth={2} />
                  Add user
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9">
                    Name
                  </th>
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9">
                    Email
                  </th>
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9 w-28">
                    Role
                  </th>
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9 w-24">
                    Status
                  </th>
                  <th className="text-left font-medium text-ink-2 text-[12px] px-4 h-9 w-36">
                    Last login
                  </th>
                  <th className="text-right font-medium text-ink-2 text-[12px] px-4 h-9 w-40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-line last:border-0 hover:bg-sunken/50 transition-colors"
                  >
                    <td className="px-4 h-10 text-ink">
                      {u.full_name}
                      {self?.id === u.id && (
                        <span className="ml-1.5 text-[11px] text-ink-3">(you)</span>
                      )}
                    </td>
                    <td className="px-4 h-10 text-ink-2">{u.email}</td>
                    <td className="px-4 h-10">
                      <Badge tone={ROLE_TONES[u.role] ?? "neutral"}>{u.role}</Badge>
                    </td>
                    <td className="px-4 h-10">
                      <Badge tone={u.status === "ACTIVE" ? "ok" : "neutral"}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-4 h-10 text-ink-2 tabular">
                      {formatLastLogin(u.last_login_at)}
                    </td>
                    <td className="px-4 h-10 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </Button>
                        {self?.id !== u.id && u.status === "ACTIVE" && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeactivateTarget(u)}
                          >
                            Deactivate
                          </Button>
                        )}
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
            <Button
              variant="default"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
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

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add user"
        footer={
          <>
            <Button variant="default" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={creating}
              onClick={handleCreate}
            >
              {creating ? "Creating" : "Create user"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-3">
          {createError && <InlineAlert tone="bad">{createError}</InlineAlert>}
          <Input
            label="Full name"
            value={createForm.full_name}
            onChange={(e) =>
              setCreateForm({ ...createForm, full_name: e.target.value })
            }
            placeholder="Budi Santoso"
            required
          />
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) =>
              setCreateForm({ ...createForm, email: e.target.value })
            }
            placeholder="budi@company.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm({ ...createForm, password: e.target.value })
            }
            placeholder="Minimal 8 karakter"
            required
          />
          <Select
            label="Role"
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            options={ROLE_OPTIONS}
          />
          <p className="text-[12px] text-ink-3 leading-relaxed">
            Kasih credentials ini ke karyawan manual — tidak ada email invite.
          </p>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`Edit ${editTarget?.full_name ?? ""}`}
        footer={
          <>
            <Button variant="default" size="sm" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={editing}
              onClick={handleEdit}
            >
              {editing ? "Saving" : "Save changes"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-3">
          {editError && <InlineAlert tone="bad">{editError}</InlineAlert>}
          <Input
            label="Full name"
            value={editForm.full_name}
            onChange={(e) =>
              setEditForm({ ...editForm, full_name: e.target.value })
            }
            required
          />
          <Select
            label="Role"
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            options={ROLE_OPTIONS}
          />
          <Select
            label="Status"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Deactivate user"
        message={`${deactivateTarget?.full_name ?? ""} tidak akan bisa login lagi. Dokumen dan riwayat chat-nya tetap aman.`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </AppShell>
  );
}
