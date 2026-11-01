"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getToken, type User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api.get<User>("/auth/me").then(setUser).catch(() => router.push("/login"));
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
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

      {/* Main */}
      <main className="ml-60 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">
            Welcome, {user.full_name}
          </h1>
          <p className="text-text-secondary mt-1">
            Role: {user.role} · Status: {user.status}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Documents" value="—" href="/documents" />
          <StatCard title="Collections" value="—" href="/collections" />
          <StatCard title="Conversations" value="—" href="/chat" />
          <StatCard title="Your Role" value={user.role} />
        </div>

        <div className="mt-8 p-6 bg-surface rounded-xl border border-border">
          <h3 className="font-medium text-text-primary mb-2">Quick Actions</h3>
          <div className="flex gap-3">
            <a
              href="/documents"
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
            >
              Upload Document
            </a>
            <a
              href="/chat"
              className="px-4 py-2 border border-border text-text-primary text-sm rounded-lg hover:bg-background transition-colors"
            >
              Ask AI
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, href }: { title: string; value: string; href?: string }) {
  const content = (
    <div className="p-6 bg-surface rounded-xl border border-border">
      <p className="text-sm text-text-secondary">{title}</p>
      <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}
