"use client";

import { Chat } from "@/components/automation/chat";
import { useEffect } from "react";
import { connectWS } from "@/lib/ws";

export default function AutomationSessionPage() {
  useEffect(() => { connectWS(); }, []);

  return (
    <div className="flex h-[calc(100vh-56px)] bg-zinc-950 text-zinc-100">
      <Chat />
    </div>
  );
}
