"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (login(password)) {
      router.replace("/");
    } else {
      setError("Access denied.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-lg font-bold tracking-tight text-zinc-100">
            unix<span className="text-fuchsia-400">corn</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">
            offensive security environment
          </p>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900 p-6">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Authentication Required
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter access password..."
                autoFocus
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded bg-fuchsia-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Authenticating…" : "Access"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[10px] text-zinc-700">
          local-first · no telemetry · offline
        </p>
      </div>
    </div>
  );
}
