"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Header } from "@/components/layout/header";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-fuchsia-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-14">{children}</main>
    </>
  );
}
