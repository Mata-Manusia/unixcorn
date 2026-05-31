"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon, BoltIcon, GlobeAltIcon, DocumentTextIcon,
  WrenchScrewdriverIcon, ServerStackIcon, ShieldExclamationIcon,
  ArrowTopRightOnSquareIcon, ClockIcon, SignalIcon,
} from "@heroicons/react/24/outline";
import { useStore } from "@/lib/store";
import { connectWS } from "@/lib/ws";
import {
  fetchScans, fetchExploitScans, fetchFindScans, fetchExploitVulns,
} from "@/lib/api";
import { getUser } from "@/lib/auth";

interface FindScan {
  id: string;
  category: string;
  tlds: string[];
  status: string;
  total: number;
  created_at: string;
}

interface VulnStub {
  severity: string;
  name: string;
  endpoint: string;
  timestamp: string;
}

type ActivityItem = {
  kind: "recon" | "exploit" | "find";
  id: string;
  title: string;
  subtitle: string;
  status: string;
  ts: string;
  href: string;
};

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-950 text-red-400 border-red-800",
  HIGH:     "bg-orange-950 text-orange-400 border-orange-800",
  MEDIUM:   "bg-yellow-950 text-yellow-400 border-yellow-800",
  LOW:      "bg-zinc-800 text-zinc-400 border-zinc-700",
  INFO:     "bg-blue-950 text-blue-400 border-blue-800",
};

const STATUS_COLOR: Record<string, string> = {
  running:   "text-fuchsia-400 bg-fuchsia-500",
  completed: "text-green-400 bg-green-500",
  stopped:   "text-yellow-400 bg-yellow-500",
  failed:    "text-red-400 bg-red-500",
  pending:   "text-zinc-500 bg-zinc-600",
};

export default function DashboardPage() {
  const { scans, setScans, exploitScans, setExploitScans, wsConnected } = useStore();
  const [findScans, setFindScans] = useState<FindScan[]>([]);
  const [recentVulns, setRecentVulns] = useState<VulnStub[]>([]);
  const [username, setUsername] = useState<string>("guest");

  useEffect(() => {
    connectWS();
    setUsername(getUser()?.username || "guest");

    Promise.all([
      fetchScans().catch(() => []),
      fetchExploitScans().catch(() => []),
      fetchFindScans().catch(() => []),
    ]).then(([s, e, f]) => {
      setScans(s || []);
      setExploitScans(e || []);
      setFindScans(f || []);

      // Pull vulns from latest 3 exploit scans (parallel)
      const latest = (e || []).slice(0, 3);
      Promise.all(latest.map((sc: { id: string }) => fetchExploitVulns(sc.id).catch(() => [])))
        .then((all) => {
          const flat = all.flat() as VulnStub[];
          flat.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setRecentVulns(flat.slice(0, 8));
        });
    });
  }, [setScans, setExploitScans]);

  // Aggregate counts
  const reconActive    = scans.filter((s) => s.status === "running").length;
  const exploitActive  = exploitScans.filter((s) => s.status === "running").length;
  const totalActivity  = scans.length + exploitScans.length + findScans.length;
  const totalFindings  = findScans.reduce((a, f) => a + (f.total || 0), 0);

  // Merge activity timeline
  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...scans.map((s) => ({
        kind: "recon" as const, id: s.id, title: s.target,
        subtitle: "Recon scan", status: s.status, ts: s.created_at,
        href: `/recon`,
      })),
      ...exploitScans.map((s) => ({
        kind: "exploit" as const, id: s.id, title: s.target,
        subtitle: `Exploit · phases ${s.phases}`, status: s.status, ts: s.created_at,
        href: `/exploit`,
      })),
      ...findScans.map((s) => ({
        kind: "find" as const, id: s.id, title: `${s.category} · ${s.tlds.slice(0, 2).join(", ")}`,
        subtitle: `DeepSearch · ${s.total} targets`, status: s.status, ts: s.created_at,
        href: `/find`,
      })),
    ];
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return items.slice(0, 12);
  }, [scans, exploitScans, findScans]);

  const features = [
    {
      href: "/find",   icon: GlobeAltIcon,    label: "Find",
      desc: "OSINT subdomain discovery + dorking",
      count: findScans.length, color: "text-blue-400",
    },
    {
      href: "/recon",  icon: MagnifyingGlassIcon, label: "Recon",
      desc: "subfinder · httpx · naabu · nuclei",
      count: scans.length, color: "text-cyan-400",
    },
    {
      href: "/exploit", icon: BoltIcon, label: "Exploit",
      desc: "Active CVE templates + chain analysis",
      count: exploitScans.length, color: "text-fuchsia-400",
    },
    {
      href: "/logs",   icon: DocumentTextIcon, label: "Logs",
      desc: "Stream all scan stdout/stderr",
      count: null, color: "text-amber-400",
    },
    {
      href: "/tools",  icon: WrenchScrewdriverIcon, label: "Tools",
      desc: "Plugin runtime · pentest helpers",
      count: null, color: "text-purple-400",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-zinc-950 p-4 lg:p-6 text-zinc-100">
      {/* Greeting */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dashboard</p>
          <h1 className="mt-1 text-lg font-bold text-zinc-100">
            Welcome back, <span className="text-fuchsia-400">{username}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            WS {wsConnected ? "live" : "offline"}
          </span>
          <span>{new Date().toLocaleString("id-ID", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Total Activity" value={totalActivity} sublabel={`${reconActive + exploitActive} running`} icon={<SignalIcon className="h-5 w-5 text-fuchsia-400" />} />
        <Metric label="Recon Scans"    value={scans.length}        sublabel={`${reconActive} active`}   icon={<MagnifyingGlassIcon className="h-5 w-5 text-cyan-400" />} />
        <Metric label="Exploit Scans"  value={exploitScans.length} sublabel={`${exploitActive} active`} icon={<BoltIcon className="h-5 w-5 text-fuchsia-400" />} />
        <Metric label="Find Targets"   value={totalFindings}       sublabel={`${findScans.length} scans`} icon={<GlobeAltIcon className="h-5 w-5 text-blue-400" />} />
      </div>

      {/* Feature tiles */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Quick Launch</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group rounded border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
              >
                <div className="mb-2 flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${f.color}`} />
                  {f.count !== null && (
                    <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                      {f.count}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-zinc-200">{f.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{f.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two-column: Activity timeline + Recent Vulns */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">

        {/* Activity timeline */}
        <div className="rounded border border-zinc-800 bg-zinc-900 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
            <ClockIcon className="h-3 w-3 text-zinc-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">All Activity</span>
            <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{activity.length}</span>
          </div>
          {activity.length === 0 ? (
            <p className="px-3 py-6 text-center text-[11px] text-zinc-600">No scans yet. Launch one from above.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {activity.map((a) => {
                const sc = STATUS_COLOR[a.status] || STATUS_COLOR.pending;
                const [textCol, dotCol] = sc.split(" ");
                return (
                  <Link
                    key={`${a.kind}-${a.id}`}
                    href={a.href}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800/40 transition-colors"
                  >
                    <span className={`shrink-0 inline-block h-1.5 w-1.5 rounded-full ${dotCol} ${a.status === "running" ? "animate-pulse" : ""}`} />
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      a.kind === "recon"   ? "border-cyan-800 bg-cyan-950 text-cyan-400"
                      : a.kind === "exploit" ? "border-fuchsia-800 bg-fuchsia-950 text-fuchsia-400"
                      : "border-blue-800 bg-blue-950 text-blue-400"
                    }`}>
                      {a.kind}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-mono text-zinc-200">{a.title}</p>
                      <p className="text-[10px] text-zinc-600">{a.subtitle}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-medium ${textCol}`}>{a.status}</span>
                    <span className="shrink-0 text-[10px] text-zinc-700 font-mono">
                      {new Date(a.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 shrink-0 text-zinc-700" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Vulns */}
        <div className="rounded border border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
            <ShieldExclamationIcon className="h-3 w-3 text-red-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Recent Findings</span>
            <Link href="/exploit" className="ml-auto text-[10px] text-fuchsia-400 hover:text-fuchsia-300">
              view all →
            </Link>
          </div>
          {recentVulns.length === 0 ? (
            <p className="px-3 py-6 text-center text-[11px] text-zinc-600">No vulnerabilities discovered.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {recentVulns.map((v, i) => (
                <div key={i} className="px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${SEV_COLOR[v.severity] || SEV_COLOR.INFO}`}>
                      {v.severity}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono ml-auto">
                      {new Date(v.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="truncate text-xs font-medium text-zinc-200">{v.name}</p>
                  <p className="truncate text-[10px] font-mono text-zinc-600">{v.endpoint}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System status footer */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatusCard
          label="WebSocket"
          value={wsConnected ? "Connected" : "Disconnected"}
          ok={wsConnected}
          icon={<SignalIcon className="h-4 w-4" />}
        />
        <StatusCard
          label="Go Daemon"
          value="localhost:8080"
          ok={wsConnected}
          icon={<ServerStackIcon className="h-4 w-4" />}
        />
        <StatusCard
          label="Active Workers"
          value={`${reconActive + exploitActive} running / 4 max`}
          ok={true}
          icon={<BoltIcon className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, sublabel, icon }: { label: string; value: number; sublabel: string; icon: React.ReactNode }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-zinc-100 leading-tight">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[10px] text-zinc-600">{sublabel}</p>
    </div>
  );
}

function StatusCard({ label, value, ok, icon }: { label: string; value: string; ok: boolean; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-zinc-800 ${ok ? "text-green-400" : "text-red-400"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="text-xs font-mono text-zinc-300 truncate">{value}</p>
      </div>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
    </div>
  );
}
