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
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setPathname(window.location.pathname);
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
        <p className="text-ink-2 text-sm">Loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-surface border-r border-line flex flex-col">
        {/* Brand */}
        <div className="h-14 px-5 flex items-center border-b border-line">
          <a href="/dashboard" className="text-[15px] font-semibold text-ink tracking-tight">
            Curio<span className="text-accent">AI</span>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-ctrl text-sm transition-colors ${
                  active
                    ? "bg-sunken text-ink font-medium"
                    : "text-ink-2 hover:bg-sunken hover:text-ink"
                }`}
              >
                <item.icon size={15} strokeWidth={1.75} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="h-14 px-4 flex items-center border-t border-line">
          <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 ml-2.5">
            <p className="text-[13px] font-medium text-ink truncate leading-tight">
              {user.full_name}
            </p>
            <p className="text-[11px] text-ink-3 leading-tight">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-ink-3 hover:text-ink rounded-ctrl hover:bg-sunken transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 min-h-screen">{children}</main>
    </div>
  );
}
