"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, type Collection } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";

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
      <div className="p-8 max-w-6xl">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Collections</h1>
            <p className="text-sm text-ink-2 mt-1">
              Organize documents into logical groups
            </p>
          </div>
          <Button size="md" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} strokeWidth={2} />
            New collection
          </Button>
        </header>

        {showForm && (
          <Card className="p-5 mb-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="col-name" className="block text-sm font-medium text-ink mb-1.5">
                  Name
                </label>
                <input
                  id="col-name"
                  type="text"
                  placeholder="e.g. Engineering Handbook"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-input border border-line bg-surface text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="col-desc" className="block text-sm font-medium text-ink mb-1.5">
                  Description <span className="text-ink-3 font-normal">(optional)</span>
                </label>
                <input
                  id="col-desc"
                  type="text"
                  placeholder="What this collection contains"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-input border border-line bg-surface text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Create</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
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
            <LoadingState label="Loading collections…" />
          </Card>
        ) : collections.length === 0 ? (
          <Card>
            <EmptyState
              title="No collections yet"
              description="Create a collection to group related documents together."
              action={
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus size={14} strokeWidth={2} />
                  Create collection
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => (
              <Card key={col.id} className="p-5">
                <h3 className="font-medium text-ink">{col.name}</h3>
                {col.description && (
                  <p className="text-sm text-ink-2 mt-1 leading-relaxed">{col.description}</p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-ink-3">
                    {new Date(col.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(col.id)}
                    className="p-1.5 text-ink-3 hover:text-bad rounded-btn hover:bg-bad-soft transition-colors"
                    aria-label={`Delete ${col.name}`}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
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
