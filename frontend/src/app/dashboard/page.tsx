"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, FolderClosed, MessagesSquare } from "lucide-react";
import { api, type User } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card, LoadingState } from "@/components/ui";

interface Analytics {
  total_documents: number;
  completed_documents: number;
  pending_documents: number;
  failed_documents: number;
  total_conversations: number;
  total_messages: number;
  total_users: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Analytics | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, analytics] = await Promise.all([
        api.get<User>("/auth/me"),
        api.get<Analytics>("/analytics/overview").catch(() => null),
      ]);
      setUser(me);
      setStats(analytics);
    } catch {
      /* AppShell handles redirect */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            {user ? `Welcome back, ${user.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            Overview of your knowledge base and AI activity.
          </p>
        </header>

        {/* Stats */}
        {stats === null ? (
          <LoadingState label="Loading statistics…" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Documents"
              value={stats.total_documents}
              detail={`${stats.completed_documents} processed`}
              icon={<FileText size={16} strokeWidth={1.75} />}
            />
            <StatCard
              label="Conversations"
              value={stats.total_conversations}
              detail={`${stats.total_messages} messages`}
              icon={<MessagesSquare size={16} strokeWidth={1.75} />}
            />
            <StatCard
              label="Team members"
              value={stats.total_users}
              icon={<FolderClosed size={16} strokeWidth={1.75} />}
            />
            <StatCard
              label="Pending"
              value={stats.pending_documents}
              detail={stats.failed_documents > 0 ? `${stats.failed_documents} failed` : undefined}
              icon={<FileText size={16} strokeWidth={1.75} />}
            />
          </div>
        )}

        {/* Quick actions */}
        <Card className="p-6">
          <h2 className="text-sm font-medium text-ink mb-3">Get started</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/documents"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-btn hover:bg-accent-hover transition-colors"
            >
              <FileText size={14} strokeWidth={2} />
              Upload documents
            </a>
            <a
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface text-ink border border-line text-sm font-medium rounded-btn hover:bg-sunken transition-colors"
            >
              <MessagesSquare size={14} strokeWidth={2} />
              Ask AI
            </a>
            <a
              href="/tutorial"
              className="inline-flex items-center gap-2 px-4 py-2 text-ink-2 text-sm font-medium rounded-btn hover:bg-sunken hover:text-ink transition-colors"
            >
              Read tutorial
            </a>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-2">{label}</span>
        <span className="text-ink-3">{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-ink tabular">{value}</p>
      {detail && <p className="text-xs text-ink-3 mt-1">{detail}</p>}
    </Card>
  );
}
