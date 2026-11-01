"use client";

import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui";

const STEPS = [
  {
    title: "Upload a document",
    body: "Go to the Documents page and click Upload. Supported formats are PDF, DOCX, and TXT, up to 20 MB per file. The file is stored in MinIO object storage and its metadata is saved to PostgreSQL.",
    link: { href: "/documents", label: "Go to Documents" },
  },
  {
    title: "Process it for AI",
    body: "After upload the document has a PENDING status. Click Process to run the RAG ingestion pipeline: text extraction, chunking, embedding generation, and vector indexing in Qdrant. Status changes to COMPLETED when done.",
    link: null,
  },
  {
    title: "Ask a question",
    body: "Open the AI Chat page and start a new conversation. Type a question about the content of your documents. CurioAI embeds your question, searches Qdrant for the most relevant chunks, and sends them as context to the LLM.",
    link: { href: "/chat", label: "Open AI Chat" },
  },
  {
    title: "Read the answer with citations",
    body: "The response is grounded in your documents. Below each answer you will see source citations showing which document and page the information came from, along with a relevance score.",
    link: null,
  },
  {
    title: "Organize with collections",
    body: "Create collections to group related documents. Collections help you filter the document list and scope your knowledge base. Deleting a collection never deletes the documents inside it.",
    link: { href: "/collections", label: "Manage Collections" },
  },
];

const ARCHITECTURE = [
  { name: "FastAPI", role: "REST API backend, Python 3.13+" },
  { name: "PostgreSQL", role: "Relational data: users, orgs, documents, conversations" },
  { name: "Qdrant", role: "Vector database for semantic search" },
  { name: "Redis", role: "Caching and session data" },
  { name: "MinIO", role: "S3-compatible object storage for original files" },
  { name: "Next.js", role: "React frontend with Tailwind CSS" },
  { name: "sentence-transformers", role: "Local embedding model (all-MiniLM-L6-v2)" },
  { name: "LLM Provider", role: "Gemini, OpenAI, Groq, OpenRouter, or custom" },
];

export default function TutorialPage() {
  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">How CurioAI Works</h1>
          <p className="text-sm text-ink-2 mt-1">
            A quick guide to the RAG pipeline and how to use the platform.
          </p>
        </header>

        {/* Steps */}
        <div className="space-y-4 mb-10">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-5">
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-ink">{step.title}</h3>
                  <p className="text-sm text-ink-2 mt-1 leading-relaxed">{step.body}</p>
                  {step.link && (
                    <a
                      href={step.link.href}
                      className="inline-block mt-3 text-sm text-accent hover:underline"
                    >
                      {step.link.label}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Architecture */}
        <section>
          <h2 className="text-lg font-semibold text-ink mb-4">Architecture</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {ARCHITECTURE.map((tech) => (
                  <tr key={tech.name} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink w-48">{tech.name}</td>
                    <td className="px-4 py-3 text-ink-2">{tech.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* RAG pipeline detail */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-ink mb-4">RAG Pipeline</h2>
          <Card className="p-5">
            <ol className="space-y-3 text-sm text-ink-2">
              {[
                ["Ingestion", "Validate file type and size, compute SHA-256 checksum, store in MinIO, save metadata to PostgreSQL."],
                ["Extraction", "Extract text from PDF (pypdf), DOCX (python-docx), or TXT. Preserve page numbers where available."],
                ["Chunking", "Split text into ~1000-character chunks with 150-character overlap, respecting paragraph and sentence boundaries."],
                ["Embedding", "Convert each chunk to a 384-dimensional vector using all-MiniLM-L6-v2 running locally."],
                ["Indexing", "Store vectors and metadata in Qdrant with organization and document filters."],
                ["Retrieval", "Embed the user question, search Qdrant filtered by organization, return top-k chunks above the similarity threshold."],
                ["Generation", "Build a prompt with retrieved context, send to the configured LLM, return a grounded answer with source citations."],
              ].map(([term, desc]) => (
                <li key={term} className="flex gap-3">
                  <span className="font-medium text-ink shrink-0 w-24">{term}</span>
                  <span className="leading-relaxed">{desc}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
