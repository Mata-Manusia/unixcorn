"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password !== confirm) {
      setError("passwords do not match");
      setLoading(false);
      return;
    }
    const res = await register(username.trim().toLowerCase(), password);
    if (res.ok) {
      router.replace("/");
    } else {
      setError(res.error || "register failed");
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
            Create account
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="3-32 chars, a-z 0-9 _ -"
                autoFocus
                autoComplete="username"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="min 6 characters"
                autoComplete="new-password"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                autoComplete="new-password"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !username || !password || !confirm}
              className="w-full rounded bg-fuchsia-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-center text-[11px] text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-fuchsia-400 hover:text-fuchsia-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
