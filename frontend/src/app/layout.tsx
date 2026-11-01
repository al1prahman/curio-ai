import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CurioAI - Enterprise Knowledge Platform",
  description: "AI-powered knowledge management with RAG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
