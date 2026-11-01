"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Send } from "lucide-react";
import {
  api,
  type AskResponse,
  type Conversation,
  type Message,
} from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<AskResponse["sources"]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<Conversation[]>("/chat/conversations");
      setConversations(data);
      if (data.length > 0 && !activeConv) setActiveConv(data[0].id);
    } catch {
      /* auth handled by AppShell */
    }
  }, [activeConv]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const data = await api.get<Message[]>(`/chat/conversations/${convId}`);
      setMessages(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv);
  }, [activeConv, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNew() {
    const conv = await api.post<Conversation>("/chat/conversations", {
      title: `Chat ${new Date().toLocaleDateString()}`,
    });
    setConversations((prev) => [conv, ...prev]);
    setActiveConv(conv.id);
    setMessages([]);
    setSources([]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeConv || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
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
      setSources(data.sources);
      await loadMessages(activeConv);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="flex h-screen">
        {/* Conversation list */}
        <div className="w-56 border-r border-line bg-surface flex flex-col">
          <div className="h-12 px-3 flex items-center border-b border-line">
            <Button size="sm" variant="primary" onClick={handleNew} className="w-full">
              <Plus size={13} strokeWidth={2} />
              New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConv(conv.id);
                  setSources([]);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-ctrl text-[13px] truncate transition-colors ${
                  activeConv === conv.id
                    ? "bg-sunken text-ink font-medium"
                    : "text-ink-2 hover:bg-sunken hover:text-ink"
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <h2 className="text-[15px] font-semibold text-ink mb-1.5">
                    Ask your knowledge base
                  </h2>
                  <p className="text-[13px] text-ink-2 leading-relaxed">
                    Ask questions about your uploaded documents. CurioAI retrieves
                    relevant passages and answers with source citations.
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
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-card text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-ink text-white"
                        : "bg-surface border border-line text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && msg.latency_ms != null && (
                      <p className="text-[11px] text-ink-3 mt-1.5 tabular">
                        {msg.model_name} · {msg.latency_ms}ms
                        {msg.input_tokens != null
                          ? ` · ${msg.input_tokens}+${msg.output_tokens} tokens`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Sources */}
            {sources.length > 0 && (
              <div className="max-w-[75%] space-y-1.5">
                <p className="text-[11px] font-medium text-ink-2">Sources</p>
                {sources.map((src, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 bg-surface border border-line rounded-ctrl text-[12px] text-ink-2"
                  >
                    <span className="font-medium text-ink">
                      {src.document_name || "Unknown"}
                    </span>
                    {src.page_number != null && ` · page ${src.page_number}`}
                    {src.relevance_score != null &&
                      ` · ${(src.relevance_score * 100).toFixed(0)}% match`}
                    {src.excerpt && (
                      <p className="mt-0.5 line-clamp-2 leading-relaxed">{src.excerpt}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface border border-line px-3.5 py-3 rounded-card">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-line p-3 bg-surface">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents"
                disabled={!activeConv || loading}
                className="flex-1 h-9 px-3 rounded-ctrl border border-line bg-canvas text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!input.trim() || !activeConv || loading}
              >
                <Send size={13} strokeWidth={2} />
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
