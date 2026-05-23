import { MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type { Scan } from "@/lib/store";
import Link from "next/link";

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function ScanIcon({ status }: { status: Scan["status"] }) {
  if (status === "completed") return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
  if (status === "failed")    return <XCircleIcon className="h-4 w-4 text-red-400" />;
  return <MagnifyingGlassIcon className="h-4 w-4 text-fuchsia-400" />;
}

const statusColor = (s: string) => ({
  running:   "text-fuchsia-400",
  completed: "text-green-400",
  failed:    "text-red-400",
  stopped:   "text-yellow-400",
}[s] ?? "text-zinc-500");

export function RecentActivity({ scans }: { scans: Scan[] }) {
  const recent = scans.slice(0, 5);

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold text-zinc-300">Recent Activity</p>
          <p className="text-[10px] text-zinc-600">Latest recon scans</p>
        </div>
        <Link
          href="/recon"
          className="rounded border border-zinc-700 px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          View All
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-700">
          <MagnifyingGlassIcon className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">No scans yet. Start a recon.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {recent.map((scan) => (
            <div key={scan.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-700 bg-zinc-800">
                <ScanIcon status={scan.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-zinc-300 truncate">{scan.target}</p>
                <p className="text-[10px] text-zinc-600">
                  status: <span className={statusColor(scan.status)}>{scan.status}</span>
                  {" · "}{scan.id.slice(0, 8)}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-zinc-700">{timeAgo(scan.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
