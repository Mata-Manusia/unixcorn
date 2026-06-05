"use client";

import { Chat } from "@/components/automation/chat";
import { useEffect } from "react";
import { connectWS } from "@/lib/ws";

export default function AutomationPage() {
  useEffect(() => { connectWS(); }, []);

  return (
    <div className="flex h-[calc(100vh-56px)] bg-zinc-950 text-zinc-100">
      <Chat />
    </div>
  );
}
