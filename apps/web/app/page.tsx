"use client";

import { useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useStore } from "@/lib/store";
import { connectWS } from "@/lib/ws";
import { fetchScans } from "@/lib/api";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SystemStatus } from "@/components/dashboard/system-status";

export default function DashboardPage() {
  const { scans, setScans, wsConnected } = useStore();

  useEffect(() => {
    connectWS();
    fetchScans().then(setScans).catch(() => {});
  }, [setScans]);

  const totalScans     = scans.length;
  const activeScans    = scans.filter((s) => s.status === "running").length;
  const completedScans = scans.filter((s) => s.status === "completed").length;

  return (
    <div className="bg-zinc-950 min-h-[calc(100vh-56px)] text-zinc-100 p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dashboard</p>
        <span className="text-[10px] text-zinc-700">Overview</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Total Scans"
          value={totalScans}
          icon={<MagnifyingGlassIcon className="h-5 w-5 text-fuchsia-400" />}
        />
        <StatCard
          label="Active Scans"
          value={activeScans}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 text-fuchsia-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={completedScans}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 text-fuchsia-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentActivity scans={scans} />
        </div>
        <SystemStatus wsConnected={wsConnected} activeScans={activeScans} />
      </div>
    </div>
  );
}
