"use client";

import AppShell from "@/components/AppShell";
import { Card, PageHeader } from "@/components/ui";

const STEPS = [
  {
    title: "Upload a document",
    body: "Go to Documents and click Upload. Supported formats are PDF, DOCX, and TXT, up to 20 MB per file. The file is stored in MinIO and its metadata is saved to PostgreSQL.",
    link: { href: "/documents", label: "Go to Documents" },
  },
  {
    title: "Process it for AI",
    body: "After upload the document has a PENDING status. Click Process to run the ingestion pipeline: text extraction, chunking, embedding generation, and vector indexing in Qdrant. The status changes to COMPLETED when done.",
    link: null,
  },
  {
    title: "Ask a question",
    body: "Open AI Chat and start a new conversation. Type a question about your documents. CurioAI embeds your question, searches Qdrant for the most relevant chunks, and sends them as context to the LLM.",
    link: { href: "/chat", label: "Open AI Chat" },
  },
  {
    title: "Read the answer with citations",
    body: "The response is grounded in your documents. Below each answer you see source citations showing which document and page the information came from, with a relevance score.",
    link: null,
  },
  {
    title: "Control access",
    body: "Administrators can grant document-level permissions to specific users or roles. Employees only see documents they are authorized to access, both in the document list and in AI chat results.",
    link: null,
  },
];

const ARCHITECTURE = [
  { name: "FastAPI", role: "REST API backend, Python 3.13+" },
  { name: "PostgreSQL", role: "Relational data: users, orgs, documents, conversations" },
  { name: "Qdrant", role: "Vector database for semantic search" },
  { name: "Redis", role: "Caching and rate limiting" },
  { name: "MinIO", role: "S3-compatible object storage for original files" },
  { name: "Next.js", role: "React frontend with Tailwind CSS" },
  { name: "sentence-transformers", role: "Local embedding model (all-MiniLM-L6-v2)" },
  { name: "Gemini", role: "LLM provider (configurable: OpenAI, Groq, OpenRouter)" },
];

export default function TutorialPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-3xl">
        <PageHeader
          title="How CurioAI works"
          description="A guide to the RAG pipeline and how to use the platform."
        />

        <div className="space-y-3 mb-8">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-4">
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-medium text-ink">{step.title}</h3>
                  <p className="text-[13px] text-ink-2 mt-1 leading-relaxed">{step.body}</p>
                  {step.link && (
                    <a
                      href={step.link.href}
                      className="inline-block mt-2 text-[13px] text-accent hover:underline"
                    >
                      {step.link.label}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <section className="mb-8">
          <h2 className="text-[15px] font-semibold text-ink mb-3">Architecture</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-[13px]">
              <tbody>
                {ARCHITECTURE.map((tech) => (
                  <tr key={tech.name} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 font-medium text-ink w-48">{tech.name}</td>
                    <td className="px-4 py-2 text-ink-2">{tech.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-ink mb-3">RAG pipeline</h2>
          <Card className="p-4">
            <ol className="space-y-2.5 text-[13px] text-ink-2">
              {[
                ["Ingestion", "Validate file type and size, compute SHA-256 checksum, store in MinIO, save metadata to PostgreSQL."],
                ["Extraction", "Extract text from PDF (pypdf), DOCX (python-docx), or TXT. Preserve page numbers where available."],
                ["Chunking", "Split text into roughly 1000-character chunks with 150-character overlap, respecting paragraph and sentence boundaries."],
                ["Embedding", "Convert each chunk to a 384-dimensional vector using all-MiniLM-L6-v2 running locally."],
                ["Indexing", "Store vectors and metadata in Qdrant with organization and document filters."],
                ["Retrieval", "Embed the user question, search Qdrant filtered by organization and permissions, return top-k chunks above the similarity threshold."],
                ["Generation", "Build a prompt with retrieved context and conversation history, send to the configured LLM, return a grounded answer with source citations."],
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
