"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  FolderClosed,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
} from "lucide-react";
import { api, getToken, setToken, type User } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/collections", label: "Collections", icon: FolderClosed },
  { href: "/chat", label: "AI Chat", icon: MessagesSquare },
  { href: "/docs", label: "API Docs", icon: BookOpen },
  { href: "/tutorial", label: "Tutorial", icon: BookOpen },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  function handleLogout() {
    api.post("/auth/logout").catch(() => {});
    setToken(null);
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-2 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-line flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-line">
          <a href="/dashboard" className="text-lg font-semibold text-ink tracking-tight">
            Curio<span className="text-accent">AI</span>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-btn text-sm text-ink-2 hover:bg-sunken hover:text-ink transition-colors [&.active]:bg-accent-soft [&.active]:text-accent"
            >
              <item.icon size={16} strokeWidth={1.75} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-line">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{user.full_name}</p>
              <p className="text-xs text-ink-3">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-ink-3 hover:text-ink rounded-btn hover:bg-sunken transition-colors"
              aria-label="Log out"
            >
              <LogOut size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen">{children}</main>
    </div>
  );
}
