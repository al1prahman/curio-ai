"use client";

import AppShell from "@/components/AppShell";
import { Card, PageHeader } from "@/components/ui";

const ENDPOINTS = [
  {
    group: "Authentication",
    routes: [
      { method: "POST", path: "/api/v1/auth/login", desc: "Sign in, returns JWT tokens" },
      { method: "POST", path: "/api/v1/auth/logout", desc: "End the current session" },
      { method: "GET", path: "/api/v1/auth/me", desc: "Current user profile" },
      { method: "POST", path: "/api/v1/auth/refresh", desc: "Refresh an expired token" },
    ],
  },
  {
    group: "Users",
    routes: [
      { method: "GET", path: "/api/v1/users", desc: "List organization users" },
      { method: "POST", path: "/api/v1/users", desc: "Create a user (admin only)" },
      { method: "GET", path: "/api/v1/users/{id}", desc: "User details" },
      { method: "PATCH", path: "/api/v1/users/{id}", desc: "Update role, name, or status" },
      { method: "DELETE", path: "/api/v1/users/{id}", desc: "Deactivate a user" },
    ],
  },
  {
    group: "Collections",
    routes: [
      { method: "GET", path: "/api/v1/collections", desc: "List collections" },
      { method: "POST", path: "/api/v1/collections", desc: "Create a collection" },
      { method: "GET", path: "/api/v1/collections/{id}", desc: "Collection details" },
      { method: "PATCH", path: "/api/v1/collections/{id}", desc: "Update collection" },
      { method: "DELETE", path: "/api/v1/collections/{id}", desc: "Delete (documents preserved)" },
    ],
  },
  {
    group: "Documents",
    routes: [
      { method: "GET", path: "/api/v1/documents", desc: "List documents with filters" },
      { method: "POST", path: "/api/v1/documents/upload", desc: "Upload PDF, DOCX, TXT (max 20MB)" },
      { method: "GET", path: "/api/v1/documents/{id}", desc: "Document details" },
      { method: "POST", path: "/api/v1/documents/{id}/process", desc: "Run RAG ingestion" },
      { method: "GET", path: "/api/v1/documents/{id}/download", desc: "Download original file" },
      { method: "DELETE", path: "/api/v1/documents/{id}", desc: "Delete a document" },
    ],
  },
  {
    group: "Permissions",
    routes: [
      { method: "GET", path: "/api/v1/documents/{id}/permissions", desc: "List document permissions" },
      { method: "POST", path: "/api/v1/documents/{id}/permissions", desc: "Grant access to a user or role" },
      { method: "DELETE", path: "/api/v1/documents/{id}/permissions/{pid}", desc: "Revoke access" },
    ],
  },
  {
    group: "AI Chat",
    routes: [
      { method: "POST", path: "/api/v1/chat/conversations", desc: "Start a conversation" },
      { method: "GET", path: "/api/v1/chat/conversations", desc: "List your conversations" },
      { method: "GET", path: "/api/v1/chat/conversations/{id}", desc: "Conversation messages" },
      { method: "PATCH", path: "/api/v1/chat/conversations/{id}", desc: "Rename conversation" },
      { method: "DELETE", path: "/api/v1/chat/conversations/{id}", desc: "Delete conversation" },
      { method: "POST", path: "/api/v1/chat/conversations/{id}/messages", desc: "Ask a question (RAG)" },
    ],
  },
  {
    group: "Feedback",
    routes: [
      { method: "POST", path: "/api/v1/chat/messages/{id}/feedback", desc: "Rate an AI response" },
      { method: "GET", path: "/api/v1/chat/messages/{id}/feedback", desc: "Get feedback for a message" },
      { method: "GET", path: "/api/v1/admin/feedback", desc: "Review all feedback (admin)" },
    ],
  },
  {
    group: "Analytics",
    routes: [
      { method: "GET", path: "/api/v1/analytics/overview", desc: "Dashboard statistics" },
      { method: "GET", path: "/api/v1/analytics/usage", desc: "AI usage over time" },
      { method: "GET", path: "/api/v1/analytics/activity", desc: "Recent activity feed" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "text-ok",
  POST: "text-accent",
  PATCH: "text-warn",
  DELETE: "text-bad",
};

export default function DocsPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-4xl">
        <PageHeader
          title="API Reference"
          description="All endpoints are prefixed with /api/v1 and require a Bearer JWT token except login."
        />

        <div className="space-y-5">
          {ENDPOINTS.map((section) => (
            <section key={section.group}>
              <h2 className="text-[13px] font-semibold text-ink mb-2">{section.group}</h2>
              <Card className="overflow-hidden">
                <table className="w-full text-[13px]">
                  <tbody>
                    {section.routes.map((route) => (
                      <tr
                        key={route.method + route.path}
                        className="border-b border-line last:border-0"
                      >
                        <td className="px-4 py-2 w-16">
                          <span
                            className={`text-[11px] font-semibold ${METHOD_COLORS[route.method]}`}
                          >
                            {route.method}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-[12px] text-ink whitespace-nowrap">
                          {route.path}
                        </td>
                        <td className="px-4 py-2 text-ink-2 text-[12px]">{route.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>

        <section className="mt-6">
          <h2 className="text-[13px] font-semibold text-ink mb-2">Interactive docs</h2>
          <Card className="p-4">
            <p className="text-[13px] text-ink-2">
              The backend generates OpenAPI docs automatically. With the backend running,
              visit{" "}
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                localhost:8000/docs
              </a>{" "}
              for Swagger UI with a try-it-out button on every endpoint.
            </p>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
