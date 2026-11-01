"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  getToken,
  type AskResponse,
  type Conversation,
  type Message,
} from "@/lib/api";

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSources, setLastSources] = useState<AskResponse["sources"]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    const data = await api.get<Conversation[]>("/chat/conversations");
    setConversations(data);
    if (data.length > 0 && !activeConv) {
      setActiveConv(data[0].id);
    }
  }, [activeConv, router]);

  const loadMessages = useCallback(
    async (convId: string) => {
      const data = await api.get<Message[]>(`/chat/conversations/${convId}`);
      setMessages(data);
    },
    []
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv);
  }, [activeConv, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNewConversation() {
    const conv = await api.post<Conversation>("/chat/conversations", {
      title: `Chat ${new Date().toLocaleString()}`,
    });
    setConversations((prev) => [conv, ...prev]);
    setActiveConv(conv.id);
    setMessages([]);
    setLastSources([]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeConv || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);

    // Optimistic user message
    setMessages((prev) => [
      ...prev,
      {
        id: "temp-" + Date.now(),
        role: "user",
        content: question,
        model_name: null,
        input_tokens: null,
        output_tokens: null,
        latency_ms: null,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const data = await api.post<AskResponse>(
        `/chat/conversations/${activeConv}/messages`,
        { question }
      );
      setLastSources(data.sources);
      // Reload messages to get persisted versions
      await loadMessages(activeConv);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-surface border-r border-border p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-text-primary mb-4">CurioAI</h2>
        <nav className="space-y-1 mb-4">
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

        <button
          onClick={handleNewConversation}
          className="w-full py-2 px-3 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors mb-4"
        >
          + New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setActiveConv(conv.id);
                setLastSources([]);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                activeConv === conv.id
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-background"
              }`}
            >
              {conv.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="ml-60 flex-1 flex flex-col h-screen">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  Ask CurioAI
                </h2>
                <p className="text-text-secondary max-w-md">
                  Ask questions about your uploaded documents. CurioAI uses RAG to
                  retrieve relevant information and provide grounded answers with
                  source citations.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-xl ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-surface border border-border text-text-primary"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && msg.latency_ms && (
                    <p className="text-xs opacity-60 mt-2">
                      {msg.model_name} · {msg.latency_ms}ms
                      {msg.input_tokens ? ` · ${msg.input_tokens}+${msg.output_tokens} tokens` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Source citations */}
          {lastSources.length > 0 && (
            <div className="max-w-[70%] space-y-2">
              <p className="text-xs font-medium text-text-secondary">Sources:</p>
              {lastSources.map((src, i) => (
                <div
                  key={i}
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
                >
                  <span className="font-medium text-text-primary">
                    {src.document_name || "Unknown"}
                  </span>
                  {src.page_number ? ` (page ${src.page_number})` : ""}
                  {src.relevance_score
                    ? ` · score ${(src.relevance_score * 100).toFixed(0)}%`
                    : ""}
                  {src.excerpt && (
                    <p className="mt-1 line-clamp-2">{src.excerpt}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border px-4 py-3 rounded-xl">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 bg-surface">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              disabled={!activeConv || loading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !activeConv || loading}
              className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
