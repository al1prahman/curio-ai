"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, type Collection } from "@/lib/api";
import AppShell from "@/components/AppShell";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ items: Collection[] }>("/collections");
      setCollections(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/collections", { name, description: description || null });
    setName("");
    setDescription("");
    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection? Documents inside will not be deleted.")) return;
    await api.delete(`/collections/${id}`);
    await load();
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl">
        <PageHeader
          title="Collections"
          description="Group related documents together"
          actions={
            <Button size="sm" variant="primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={13} strokeWidth={2} />
              New collection
            </Button>
          }
        />

        {showForm && (
          <Card className="p-4 mb-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="col-name" className="block text-[13px] font-medium text-ink mb-1">
                  Name
                </label>
                <input
                  id="col-name"
                  type="text"
                  placeholder="Engineering handbook"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-ctrl border border-line bg-surface text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="col-desc" className="block text-[13px] font-medium text-ink mb-1">
                  Description <span className="text-ink-3 font-normal">(optional)</span>
                </label>
                <input
                  id="col-desc"
                  type="text"
                  placeholder="What this collection contains"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-9 px-3 rounded-ctrl border border-line bg-surface text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="primary">
                  Create
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {error ? (
          <Card>
            <ErrorState message={error} onRetry={load} />
          </Card>
        ) : loading ? (
          <Card>
            <LoadingState label="Loading collections" />
          </Card>
        ) : collections.length === 0 ? (
          <Card>
            <EmptyState
              title="No collections yet"
              description="Create a collection to group related documents."
              action={
                <Button size="sm" variant="primary" onClick={() => setShowForm(true)}>
                  <Plus size={13} strokeWidth={2} />
                  Create collection
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {collections.map((col) => (
              <Card key={col.id} className="p-4">
                <h3 className="text-[13px] font-medium text-ink">{col.name}</h3>
                {col.description && (
                  <p className="text-[12px] text-ink-2 mt-1 leading-relaxed">
                    {col.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-ink-3">
                    {new Date(col.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(col.id)}
                    className="p-1 text-ink-3 hover:text-bad rounded-ctrl hover:bg-bad-soft transition-colors"
                    aria-label={`Delete ${col.name}`}
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
