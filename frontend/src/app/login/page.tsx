"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.post<{ access_token: string }>("/auth/login", {
        email,
        password,
      });
      setToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-7">
          <h1 className="text-xl font-semibold text-ink tracking-tight">
            Curio<span className="text-accent">AI</span>
          </h1>
          <p className="text-[13px] text-ink-2 mt-1">
            Knowledge base for your team
          </p>
        </div>

        <div className="bg-surface border border-line rounded-card p-5">
          <form onSubmit={handleLogin} className="space-y-3.5">
            {error && (
              <div
                role="alert"
                className="px-3 py-2 rounded-ctrl bg-bad-soft text-bad text-[13px]"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-ink mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-9 px-3 rounded-ctrl border border-line bg-surface text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-ink mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-9 px-3 rounded-ctrl border border-line bg-surface text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="Your password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-ink-3 mt-4">
          Demo: admin@curio.ai / admin123
        </p>
      </div>
    </div>
  );
}
