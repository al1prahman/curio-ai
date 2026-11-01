"use client";

import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui";

const ENDPOINTS = [
  {
    group: "Authentication",
    routes: [
      { method: "POST", path: "/api/v1/auth/login", desc: "Login with email and password, returns JWT tokens" },
      { method: "POST", path: "/api/v1/auth/logout", desc: "Terminate the current session" },
      { method: "GET", path: "/api/v1/auth/me", desc: "Get the current authenticated user profile" },
      { method: "POST", path: "/api/v1/auth/refresh", desc: "Refresh an expired access token" },
    ],
  },
  {
    group: "Users",
    routes: [
      { method: "GET", path: "/api/v1/users", desc: "List organization users (paginated, searchable)" },
      { method: "POST", path: "/api/v1/users", desc: "Create a new user (admin only)" },
      { method: "GET", path: "/api/v1/users/{id}", desc: "Get user details" },
      { method: "PATCH", path: "/api/v1/users/{id}", desc: "Update user role, name, or status" },
      { method: "DELETE", path: "/api/v1/users/{id}", desc: "Deactivate a user" },
    ],
  },
  {
    group: "Collections",
    routes: [
      { method: "GET", path: "/api/v1/collections", desc: "List collections (searchable)" },
      { method: "POST", path: "/api/v1/collections", desc: "Create a collection" },
      { method: "GET", path: "/api/v1/collections/{id}", desc: "Get collection details" },
      { method: "PATCH", path: "/api/v1/collections/{id}", desc: "Update collection" },
      { method: "DELETE", path: "/api/v1/collections/{id}", desc: "Delete collection (documents preserved)" },
    ],
  },
  {
    group: "Documents",
    routes: [
      { method: "GET", path: "/api/v1/documents", desc: "List documents (paginated, filter by status/collection)" },
      { method: "POST", path: "/api/v1/documents/upload", desc: "Upload documents (PDF, DOCX, TXT — max 20MB each)" },
      { method: "GET", path: "/api/v1/documents/{id}", desc: "Get document details" },
      { method: "GET", path: "/api/v1/documents/{id}/status", desc: "Get processing status" },
      { method: "POST", path: "/api/v1/documents/{id}/process", desc: "Trigger RAG processing (extract, chunk, embed, index)" },
      { method: "GET", path: "/api/v1/documents/{id}/download", desc: "Download the original file" },
      { method: "DELETE", path: "/api/v1/documents/{id}", desc: "Soft-delete a document" },
    ],
  },
  {
    group: "AI Chat",
    routes: [
      { method: "POST", path: "/api/v1/chat/conversations", desc: "Create a conversation" },
      { method: "GET", path: "/api/v1/chat/conversations", desc: "List your conversations" },
      { method: "GET", path: "/api/v1/chat/conversations/{id}", desc: "Get conversation messages" },
      { method: "PATCH", path: "/api/v1/chat/conversations/{id}", desc: "Rename a conversation" },
      { method: "DELETE", path: "/api/v1/chat/conversations/{id}", desc: "Delete a conversation" },
      { method: "POST", path: "/api/v1/chat/conversations/{id}/messages", desc: "Ask a question (RAG retrieval + LLM generation + citations)" },
    ],
  },
  {
    group: "Analytics",
    routes: [
      { method: "GET", path: "/api/v1/analytics/overview", desc: "Dashboard statistics" },
      { method: "GET", path: "/api/v1/analytics/usage", desc: "AI usage metrics over time" },
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
      <div className="p-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">API Reference</h1>
          <p className="text-sm text-ink-2 mt-1">
            All endpoints are prefixed with{" "}
            <code className="px-1.5 py-0.5 bg-sunken rounded text-xs text-ink">/api/v1</code>{" "}
            and require a Bearer JWT token except login.
          </p>
        </header>

        <div className="space-y-8">
          {ENDPOINTS.map((section) => (
            <section key={section.group}>
              <h2 className="text-sm font-semibold text-ink mb-3">{section.group}</h2>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {section.routes.map((route) => (
                      <tr key={route.method + route.path} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 w-20">
                          <span className={`text-xs font-semibold ${METHOD_COLORS[route.method]}`}>
                            {route.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink whitespace-nowrap">
                          {route.path}
                        </td>
                        <td className="px-4 py-3 text-ink-2 text-xs">{route.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>

        {/* Response format */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink mb-3">Response Format</h2>
          <Card className="p-5">
            <p className="text-sm text-ink-2 mb-3">Success responses wrap data in a consistent envelope:</p>
            <pre className="bg-sunken rounded-btn p-4 text-xs text-ink overflow-x-auto leading-relaxed">
{`{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { }
}`}
            </pre>
            <p className="text-sm text-ink-2 mt-4 mb-3">Errors follow the same shape:</p>
            <pre className="bg-sunken rounded-btn p-4 text-xs text-ink overflow-x-auto leading-relaxed">
{`{
  "success": false,
  "message": "An error occurred.",
  "error": {
    "code": "ERROR_CODE",
    "details": { }
  }
}`}
            </pre>
          </Card>
        </section>

        {/* Interactive docs */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink mb-3">Interactive Documentation</h2>
          <Card className="p-5">
            <p className="text-sm text-ink-2">
              The backend auto-generates OpenAPI docs. When the backend is running, visit{" "}
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                localhost:8000/docs
              </a>{" "}
              for Swagger UI with a &quot;Try it out&quot; button on every endpoint.
            </p>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
