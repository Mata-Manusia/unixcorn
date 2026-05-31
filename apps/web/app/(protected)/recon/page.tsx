"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MagnifyingGlassIcon, StopIcon, ChevronDownIcon,
  CheckCircleIcon, XCircleIcon,
} from "@heroicons/react/24/outline";
import { useStore, type Scan } from "@/lib/store";
import { startScan, fetchScans, fetchLogs, fetchScanResults, stopScan } from "@/lib/api";
import { connectWS } from "@/lib/ws";
import { ScanResultsTable } from "@/components/recon/scan-results-table";

const AVAILABLE_TOOLS = ["subfinder", "httpx", "naabu", "nuclei"];
const NUCLEI_TAGS = [
  { id: "cve",           label: "CVE",            desc: "Known CVEs", hot: true },
  { id: "kev",           label: "CISA KEV",       desc: "Actively exploited", hot: true },
  { id: "0day",          label: "0-Day",          desc: "Unpatched / fresh", hot: true },
  { id: "exposure",      label: "Exposures",      desc: ".env, .git, configs" },
  { id: "misconfig",     label: "Misconfig",      desc: "Default settings" },
  { id: "default-login", label: "Default Login",  desc: "admin:admin, etc." },
  { id: "takeover",      label: "Takeover",       desc: "Subdomain takeover" },
  { id: "oast",          label: "OAST",           desc: "Out-of-band callbacks" },
  { id: "intrusive",     label: "Intrusive",      desc: "Active exploitation" },
];
const SEVERITY_LEVELS = ["critical", "high", "medium", "low", "info"];

const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-950 text-red-400 border-red-800",
  high:     "bg-orange-950 text-orange-400 border-orange-800",
  medium:   "bg-yellow-950 text-yellow-400 border-yellow-800",
  low:      "bg-zinc-800 text-zinc-400 border-zinc-700",
  info:     "bg-blue-950 text-blue-400 border-blue-800",
};

interface ScanLog { id: number; scan_id: string; level: string; message: string; timestamp: string }
interface ScanResult { id: number; tool: string; type: string; result?: string; raw_output?: string }
interface ToolStatus { tool: string; status: "ok" | "failed" | "pending"; reason?: string; found: number }
interface VulnRow {
  severity: string;
  cve: string;
  name: string;
  host: string;
  raw: string;
  templateId?: string;
}
interface DiscoveredAssets {
  subdomains: string[]; liveHosts: string[]; openPorts: string[]; vulns: VulnRow[];
}

function parseToolStatus(logs: ScanLog[], tools: string[]): ToolStatus[] {
  return tools.map((tool) => {
    const toolLogs = logs.filter((l) => l.message.toLowerCase().includes(tool));
    // Failure markers from backend resolveTool / runtime
    const notInstalled = toolLogs.find((l) =>
      l.message.includes(`${tool} not installed`) ||
      l.message.includes("executable file not found") ||
      l.message.includes(`not ProjectDiscovery's ${tool}`)
    );
    if (notInstalled) return { tool, status: "failed", reason: "not installed / wrong binary", found: 0 };
    // Stage start marker
    const started = toolLogs.find((l) => l.message.includes(`Stage `) && l.message.includes(tool));
    if (started) return { tool, status: "ok", found: 0 };
    return { tool, status: "pending", found: 0 };
  });
}

function parseDiscovered(_logs: ScanLog[], results: ScanResult[]): DiscoveredAssets {
  const subdomains = new Set<string>();
  const liveHosts = new Set<string>();
  const openPorts = new Set<string>();
  const vulns: VulnRow[] = [];

  for (const r of results) {
    const v = r.result ?? r.raw_output ?? "";
    if (!v) continue;
    if (r.type === "subdomain" || r.tool === "subfinder") subdomains.add(v);
    else if (r.type === "host" || r.tool === "httpx") liveHosts.add(v);
    else if (r.type === "port" || r.tool === "naabu") openPorts.add(v);
    else if (r.type === "vuln" || r.tool === "nuclei") {
      // Parse JSONL nuclei output stored in raw_output for structured fields
      let severity = "info", cve = "", name = v, host = "", templateId = "";
      try {
        const j = JSON.parse(r.raw_output || "");
        const info = j.info || {};
        severity = (info.severity || "info").toLowerCase();
        name = info.name || v;
        templateId = j["template-id"] || "";
        host = j["matched-at"] || j.host || "";
        const cls = info.classification || {};
        if (Array.isArray(cls["cve-id"]) && cls["cve-id"].length) cve = cls["cve-id"][0];
      } catch {
        // Fallback: regex parse summary string `[SEV] CVE-XXX [NAME] — HOST`
        const sev = v.match(/^\[(critical|high|medium|low|info)\]/i);
        if (sev) severity = sev[1].toLowerCase();
        const cveMatch = v.match(/CVE-\d{4}-\d{4,}/i);
        if (cveMatch) cve = cveMatch[0];
        const hostMatch = v.match(/—\s*(https?:\/\/\S+)/);
        if (hostMatch) host = hostMatch[1];
      }
      vulns.push({ severity, cve, name, host, raw: r.raw_output || v, templateId });
    }
  }

  // Sort vulns by severity
  const order: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4, info: 5 };
  vulns.sort((a, b) => (order[a.severity] || 9) - (order[b.severity] || 9));

  return {
    subdomains: [...subdomains].filter(Boolean),
    liveHosts:  [...liveHosts].filter(Boolean),
    openPorts:  [...openPorts].filter(Boolean),
    vulns,
  };
}

function AssetList({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  const [show, setShow] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="rounded border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setShow((v) => !v)}
        className="flex w-full items-center gap-2 bg-zinc-900 px-3 py-1.5 hover:bg-zinc-800 text-left transition-colors"
      >
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${accent}`}>{items.length}</span>
        <span className="text-xs font-medium text-zinc-300">{title}</span>
        <ChevronDownIcon className={`h-3 w-3 text-zinc-600 ml-auto transition-transform ${show ? "" : "-rotate-90"}`} />
      </button>
      {show && (
        <div className="max-h-40 overflow-y-auto bg-zinc-950 divide-y divide-zinc-900">
          {items.map((item, i) => (
            <div key={i} className="px-3 py-1 font-mono text-[11px] text-zinc-400 hover:bg-zinc-900">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VulnFindings({ vulns, sevCounts }: { vulns: VulnRow[]; sevCounts: Record<string, number> }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded border border-red-900 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-zinc-900 px-3 py-1.5 hover:bg-zinc-800 text-left transition-colors"
      >
        <span className="rounded bg-red-950 border border-red-800 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
          {vulns.length}
        </span>
        <span className="text-xs font-medium text-zinc-300">Vulnerabilities (nuclei)</span>
        <div className="ml-auto flex gap-1">
          {Object.entries(sevCounts).map(([sev, n]) => (
            <span key={sev} className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${SEV_BADGE[sev]}`}>
              {sev} {n}
            </span>
          ))}
        </div>
        <ChevronDownIcon className={`h-3 w-3 text-zinc-600 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="max-h-96 overflow-y-auto bg-zinc-950 divide-y divide-zinc-900">
          {vulns.map((v, i) => (
            <div key={i} className="px-3 py-2 hover:bg-zinc-900/50">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${SEV_BADGE[v.severity] || SEV_BADGE.info}`}>
                  {v.severity}
                </span>
                {v.cve && (
                  <a
                    href={`https://www.cve.org/CVERecord?id=${v.cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-red-800 bg-red-950 px-1.5 py-0.5 text-[10px] font-mono font-bold text-red-300 hover:bg-red-900"
                  >
                    {v.cve}
                  </a>
                )}
                {v.templateId && (
                  <a
                    href={`https://github.com/projectdiscovery/nuclei-templates/search?q=${encodeURIComponent(v.templateId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-cyan-800 bg-cyan-950 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 hover:bg-cyan-900"
                  >
                    {v.templateId}
                  </a>
                )}
                <span className="flex-1 truncate text-xs text-zinc-200 font-medium">{v.name}</span>
              </div>
              {v.host && (
                <a
                  href={v.host.startsWith("http") ? v.host : `https://${v.host}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-[10px] text-fuchsia-400 hover:text-fuchsia-300 pl-1"
                >
                  {v.host}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReconPage() {
  const { scans, setScans } = useStore();

  const [target, setTarget] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>(["subfinder", "httpx", "naabu", "nuclei"]);
  const [selectedTags, setSelectedTags] = useState<string[]>(["cve", "kev", "exposure", "misconfig"]);
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(["critical", "high", "medium"]);
  const [updateTemplates, setUpdateTemplates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [logLevel, setLogLevel] = useState("all");
  const [logOpen, setLogOpen] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(true);

  const logEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    connectWS();
    fetchScans().then((data) => {
      setScans(data);
      if (data.length > 0) selectScan(data[0]);
    }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []); // eslint-disable-line

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scanLogs]);

  const loadScanData = useCallback(async (scanId: string) => {
    const [logs, results] = await Promise.all([
      fetchLogs(scanId).catch(() => []),
      fetchScanResults(scanId).catch(() => []),
    ]);
    setScanLogs(logs);
    setScanResults(results);
  }, []);

  const selectScan = useCallback((scan: Scan) => {
    setActiveScanId(scan.id);
    setScanLogs([]); setScanResults([]);
    loadScanData(scan.id);
    if (pollRef.current) clearInterval(pollRef.current);
    if (scan.status === "running") {
      pollRef.current = setInterval(async () => {
        await loadScanData(scan.id);
        const updated = await fetchScans().catch(() => null);
        if (updated) {
          setScans(updated);
          const current = updated.find((s: Scan) => s.id === scan.id);
          if (current?.status !== "running" && pollRef.current) {
            clearInterval(pollRef.current); pollRef.current = null;
          }
        }
      }, 2000);
    }
  }, [loadScanData, setScans]);

  const toggleTool = (tool: string) =>
    setSelectedTools((prev) => prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]);
  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const toggleSev = (sev: string) =>
    setSelectedSeverity((prev) => prev.includes(sev) ? prev.filter((t) => t !== sev) : [...prev, sev]);

  const handleStart = async () => {
    if (!target.trim()) return;
    setLoading(true);
    try {
      await startScan(target.trim(), selectedTools, {
        nuclei_tags: selectedTags,
        severity: selectedSeverity,
        update_templates: updateTemplates,
      });
      const updated = await fetchScans();
      setScans(updated);
      if (updated.length > 0) selectScan(updated[0]);
      setTarget("");
    } catch { /* daemon not running */ }
    finally { setLoading(false); }
  };

  const handleStop = async () => {
    if (!activeScanId) return;
    await stopScan(activeScanId).catch(() => {});
    const updated = await fetchScans().catch(() => null);
    if (updated) setScans(updated);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const activeScan = scans.find((s) => s.id === activeScanId);
  const toolStatuses = useMemo(() => parseToolStatus(scanLogs, selectedTools), [scanLogs, selectedTools]);
  const discovered   = useMemo(() => parseDiscovered(scanLogs, scanResults), [scanLogs, scanResults]);
  const anyToolFailed  = useMemo(() => toolStatuses.some((t) => t.status === "failed"), [toolStatuses]);
  const allToolsFailed = useMemo(() => toolStatuses.length > 0 && toolStatuses.every((t) => t.status === "failed"), [toolStatuses]);

  const filteredLogs = useMemo(() => {
    let logs = [...scanLogs].reverse();
    if (logLevel !== "all") logs = logs.filter((l) => l.level === logLevel);
    if (logSearch) logs = logs.filter((l) => l.message.toLowerCase().includes(logSearch.toLowerCase()));
    return logs;
  }, [scanLogs, logSearch, logLevel]);

  const totalDiscovered = discovered.subdomains.length + discovered.liveHosts.length +
    discovered.openPorts.length + discovered.vulns.length;
  const sevCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of discovered.vulns) c[v.severity] = (c[v.severity] || 0) + 1;
    return c;
  }, [discovered.vulns]);

  const statusDot = (s: string) => ({
    running:   "bg-fuchsia-500 animate-pulse",
    completed: "bg-green-500",
    stopped:   "bg-yellow-500",
    failed:    "bg-red-500",
  }[s] ?? "bg-zinc-600");

  const statusColor = (s: string) => ({
    running:   "text-fuchsia-400",
    completed: "text-green-400",
    stopped:   "text-yellow-400",
    failed:    "text-red-400",
  }[s] ?? "text-zinc-400");

  return (
    <div className="bg-zinc-950 min-h-[calc(100vh-64px)] text-zinc-100 flex flex-col">
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

        {/* ── Sidebar ── */}
        <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900 overflow-y-auto">

          {/* New scan */}
          <div className="border-b border-zinc-800 p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Recon Scan</p>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="target.com"
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
            />
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Tools</p>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_TOOLS.map((tool) => (
                  <button
                    key={tool}
                    onClick={() => toggleTool(tool)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      selectedTools.includes(tool)
                        ? "bg-fuchsia-700 text-white"
                        : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
            {selectedTools.includes("nuclei") && (
              <>
                <div className="border-t border-zinc-800 pt-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Nuclei Templates</p>
                  <div className="flex flex-wrap gap-1">
                    {NUCLEI_TAGS.map((t) => {
                      const active = selectedTags.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTag(t.id)}
                          title={t.desc}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                            active
                              ? t.hot
                                ? "bg-red-700 text-white"
                                : "bg-fuchsia-700 text-white"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Severity Filter</p>
                  <div className="flex flex-wrap gap-1">
                    {SEVERITY_LEVELS.map((s) => {
                      const active = selectedSeverity.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => toggleSev(s)}
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase transition-opacity ${SEV_BADGE[s]} ${active ? "" : "opacity-40 hover:opacity-100"}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateTemplates}
                    onChange={(e) => setUpdateTemplates(e.target.checked)}
                    className="accent-fuchsia-500"
                  />
                  Update nuclei templates first (slow, latest 0-days)
                </label>
              </>
            )}

            <button
              onClick={handleStart}
              disabled={loading || !target.trim()}
              className="flex w-full items-center justify-center gap-1.5 rounded bg-fuchsia-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-fuchsia-600 transition-colors"
            >
              <MagnifyingGlassIcon className="h-3.5 w-3.5" />
              {loading ? "Starting…" : "Start Scan"}
            </button>
          </div>

          {/* History */}
          <div className="p-2 pb-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">History</p>
          </div>
          {scans.length === 0 ? (
            <p className="px-3 pb-3 text-[10px] text-zinc-600">No scans yet.</p>
          ) : (
            scans.map((scan) => (
              <button
                key={scan.id}
                onClick={() => selectScan(scan)}
                className={`w-full px-3 py-2 text-left transition-colors hover:bg-zinc-800 border-l-2 ${
                  scan.id === activeScanId ? "border-l-fuchsia-500 bg-zinc-800" : "border-l-transparent"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusDot(scan.status)}`} />
                  <span className={`text-[10px] font-medium uppercase ${statusColor(scan.status)}`}>{scan.status}</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-300 truncate">{scan.target}</p>
                <p className="text-[10px] text-zinc-600">{scan.id.slice(0, 8)}</p>
              </button>
            ))
          )}
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {activeScan ? (
            <>
              {/* Status bar */}
              <div className="flex items-center gap-2.5 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot(activeScan.status)}`} />
                <span className={`font-semibold uppercase tracking-wide ${statusColor(activeScan.status)}`}>
                  {activeScan.status}
                </span>
                <span className="text-zinc-700">·</span>
                <span className="font-mono text-zinc-400 truncate max-w-[240px]">{activeScan.target}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">{scanLogs.length} events · {scanResults.length} results</span>
                {totalDiscovered > 0 && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="font-semibold text-green-400">{totalDiscovered} assets found</span>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {anyToolFailed && (
                    <span className="text-[10px] text-orange-400">some tools missing</span>
                  )}
                  {activeScan.status === "running" && (
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-1 rounded border border-red-800 bg-red-950 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-900 transition-colors"
                    >
                      <StopIcon className="h-3 w-3" />
                      STOP
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-2.5">

                {/* Tool status */}
                <div className="rounded border border-zinc-800 bg-zinc-900">
                  <div className="border-b border-zinc-800 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Tool Status</span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-3 py-2">
                    {toolStatuses.map((ts) => (
                      <div
                        key={ts.tool}
                        className={`flex items-center gap-1.5 rounded border px-2 py-1 ${
                          ts.status === "ok"     ? "border-green-800 bg-green-950"
                          : ts.status === "failed" ? "border-red-800 bg-red-950"
                          : "border-zinc-700 bg-zinc-800"
                        }`}
                      >
                        {ts.status === "ok"
                          ? <CheckCircleIcon className="h-3 w-3 text-green-500 shrink-0" />
                          : ts.status === "failed"
                          ? <XCircleIcon className="h-3 w-3 text-red-500 shrink-0" />
                          : <div className="h-3 w-3 rounded-full border border-zinc-600 shrink-0" />}
                        <span className={`font-mono text-[11px] ${
                          ts.status === "ok"     ? "text-green-400"
                          : ts.status === "failed" ? "text-red-400"
                          : "text-zinc-500"
                        }`}>{ts.tool}</span>
                        {ts.status === "failed" && (
                          <span className="text-[10px] text-red-700">not installed</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {anyToolFailed && (
                    <div className="border-t border-zinc-800 px-3 py-2 space-y-1.5">
                      <p className="text-[10px] text-zinc-500">Install missing tools (one-liner):</p>
                      <pre className="rounded bg-zinc-950 px-3 py-2 text-[10px] text-green-400 overflow-x-auto">{`# macOS (recommended)
brew install subfinder naabu nuclei
brew install httpx-toolkit   # ProjectDiscovery httpx — avoids collision with Python httpie's httpx

# OR via Go
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Verify (must show "projectdiscovery" in output)
subfinder -version && httpx -version && naabu -version && nuclei -version`}</pre>
                      <p className="text-[10px] text-yellow-500">
                        ⚠ If `httpx -version` shows the Python httpie httpx (not ProjectDiscovery),
                        install `httpx-toolkit` instead — the recon pipeline auto-detects + uses it.
                      </p>
                    </div>
                  )}
                </div>

                {/* Discovered assets */}
                {totalDiscovered > 0 && (
                  <div className="rounded border border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => setAssetsOpen((v) => !v)}
                      className="flex w-full items-center gap-2 bg-zinc-900 px-3 py-1.5 hover:bg-zinc-800 transition-colors"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Discovered Assets</span>
                      <span className="rounded bg-green-950 border border-green-800 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                        {totalDiscovered}
                      </span>
                      <ChevronDownIcon className={`h-3 w-3 text-zinc-600 ml-auto transition-transform ${assetsOpen ? "" : "-rotate-90"}`} />
                    </button>
                    {assetsOpen && (
                      <div className="bg-zinc-900 px-3 py-2 space-y-1.5">
                        <AssetList title="Subdomains"  items={discovered.subdomains}   accent="bg-blue-950 text-blue-400 border border-blue-800" />
                        <AssetList title="Live Hosts"  items={discovered.liveHosts}    accent="bg-green-950 text-green-400 border border-green-800" />
                        <AssetList title="Open Ports"  items={discovered.openPorts}    accent="bg-orange-950 text-orange-400 border border-orange-800" />
                        {discovered.vulns.length > 0 && (
                          <VulnFindings vulns={discovered.vulns} sevCounts={sevCounts} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Scan log */}
                <div className="rounded border border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setLogOpen((v) => !v)}
                    className="flex w-full items-center gap-2 bg-zinc-900 px-3 py-1.5 hover:bg-zinc-800/70 transition-colors"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Scan Output</span>
                    {activeScan.status === "running" && (
                      <span className="flex items-center gap-1 text-[10px] text-fuchsia-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
                        live
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-600">{filteredLogs.length} lines</span>
                    <ChevronDownIcon className={`h-3 w-3 text-zinc-600 ml-auto transition-transform ${logOpen ? "" : "-rotate-90"}`} />
                  </button>

                  {logOpen && (
                    <>
                      <div className="flex gap-2 border-t border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
                        <div className="relative flex-1">
                          <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
                          <input
                            type="text"
                            placeholder="filter…"
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            className="w-full rounded bg-zinc-800 border border-zinc-700 py-1 pl-6 pr-3 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600"
                          />
                        </div>
                        <select
                          value={logLevel}
                          onChange={(e) => setLogLevel(e.target.value)}
                          className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-400 outline-none focus:border-zinc-600"
                        >
                          <option value="all">all</option>
                          <option value="ok">ok</option>
                          <option value="info">info</option>
                          <option value="warn">warn</option>
                          <option value="error">error</option>
                        </select>
                      </div>
                      <div className="h-64 overflow-y-auto bg-zinc-950 p-3 font-mono text-xs">
                        {filteredLogs.length === 0 ? (
                          <span className="text-zinc-700">
                            {activeScan.status === "running"
                              ? "waiting for output…"
                              : logSearch || logLevel !== "all"
                              ? "no matching entries."
                              : "no output. tools may not be installed."}
                          </span>
                        ) : (
                          filteredLogs.map((log) => (
                            <div key={log.id} className={`leading-5 ${
                              log.level === "error" ? "text-red-400"
                              : log.level === "warn"  ? "text-yellow-400"
                              : log.level === "ok"    ? "text-green-400"
                              : "text-zinc-400"
                            }`}>
                              <span className="select-none text-zinc-700">{new Date(log.timestamp).toLocaleTimeString()} </span>
                              <span className={`select-none mr-1 ${
                                log.level === "ok"    ? "text-green-700"
                                : log.level === "warn"  ? "text-yellow-700"
                                : log.level === "error" ? "text-red-700"
                                : "text-zinc-700"
                              }`}>[{log.level}]</span>
                              {log.message}
                            </div>
                          ))
                        )}
                        <div ref={logEndRef} />
                      </div>
                    </>
                  )}
                </div>

                {/* Results datatable */}
                <ScanResultsTable data={scanResults} />

              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-700">
              <div className="text-center">
                <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">no scan selected</p>
                <p className="text-[10px] mt-1">run a new scan or select from history</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
