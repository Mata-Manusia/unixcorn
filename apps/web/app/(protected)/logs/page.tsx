"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { fetchLogs } from "@/lib/api";
import { LogsTable } from "@/components/logs/logs-table";

export default function LogsPage() {
  const { logs, addLog } = useStore();

  useEffect(() => {
    fetchLogs()
      .then((data: Parameters<typeof addLog>[0][]) => data.forEach(addLog))
      .catch(() => {});
  }, [addLog]);

  return (
    <div className="bg-zinc-950 min-h-[calc(100vh-56px)] text-zinc-100 p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Logs</p>
        <span className="text-[10px] text-zinc-700">Activity</span>
      </div>
      <LogsTable data={logs} />
    </div>
  );
}
