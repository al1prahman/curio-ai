"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getToken, type Collection } from "@/lib/api";

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<{ items: Collection[] }>("/collections");
      setCollections(data.items);
    } finally {
      setLoading(false);
    }
  }, [router]);

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
    if (!confirm("Delete this collection? Documents will not be deleted.")) return;
    await api.delete(`/collections/${id}`);
    await load();
  }

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
            <h1 className="text-2xl font-semibold text-text-primary">Collections</h1>
            <p className="text-text-secondary mt-1">{collections.length} collections</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
          >
            + New Collection
          </button>
        </header>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 p-4 bg-surface rounded-xl border border-border space-y-3">
            <input
              type="text"
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border text-sm"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-background"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-text-secondary">Loading...</p>
          ) : collections.length === 0 ? (
            <p className="text-text-secondary">No collections yet.</p>
          ) : (
            collections.map((col) => (
              <div
                key={col.id}
                className="p-5 bg-surface rounded-xl border border-border"
              >
                <h3 className="font-medium text-text-primary">{col.name}</h3>
                {col.description && (
                  <p className="text-sm text-text-secondary mt-1">{col.description}</p>
                )}
                <p className="text-xs text-text-secondary mt-3">
                  Created {new Date(col.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => handleDelete(col.id)}
                  className="mt-3 text-danger text-xs hover:underline"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
