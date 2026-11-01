"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, FolderClosed, MessagesSquare, Users } from "lucide-react";
import { api, type User } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card, LoadingState, PageHeader } from "@/components/ui";

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
      <div className="p-6 max-w-5xl">
        <PageHeader
          title={user ? `Hello, ${user.full_name.split(" ")[0]}` : "Dashboard"}
          description="Overview of your knowledge base."
        />

        {stats === null ? (
          <Card>
            <LoadingState label="Loading statistics" />
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Documents"
              value={stats.total_documents}
              detail={`${stats.completed_documents} processed`}
              icon={<FileText size={14} strokeWidth={1.75} />}
            />
            <StatCard
              label="Conversations"
              value={stats.total_conversations}
              detail={`${stats.total_messages} messages`}
              icon={<MessagesSquare size={14} strokeWidth={1.75} />}
            />
            <StatCard
              label="Members"
              value={stats.total_users}
              icon={<Users size={14} strokeWidth={1.75} />}
            />
            <StatCard
              label="Pending"
              value={stats.pending_documents}
              detail={
                stats.failed_documents > 0
                  ? `${stats.failed_documents} failed`
                  : undefined
              }
              icon={<FolderClosed size={14} strokeWidth={1.75} />}
            />
          </div>
        )}

        <Card className="p-5">
          <h2 className="text-[13px] font-medium text-ink mb-3">Quick actions</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="/documents"
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-ink text-white text-[13px] font-medium rounded-ctrl hover:bg-ink/90 transition-colors"
            >
              <FileText size={13} strokeWidth={2} />
              Upload documents
            </a>
            <a
              href="/chat"
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-surface text-ink border border-line text-[13px] font-medium rounded-ctrl hover:bg-sunken transition-colors"
            >
              <MessagesSquare size={13} strokeWidth={2} />
              Ask a question
            </a>
            <a
              href="/tutorial"
              className="inline-flex items-center h-8 px-3 text-ink-2 text-[13px] font-medium rounded-ctrl hover:bg-sunken hover:text-ink transition-colors"
            >
              How it works
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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-ink-2">{label}</span>
        <span className="text-ink-3">{icon}</span>
      </div>
      <p className="text-xl font-semibold text-ink tabular leading-none">{value}</p>
      {detail && <p className="text-[11px] text-ink-3 mt-1.5">{detail}</p>}
    </Card>
  );
}
