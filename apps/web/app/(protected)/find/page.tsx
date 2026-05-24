"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { fetchFindScans, fetchFindTargets } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = "gov" | "school" | "university" | "company" | "ngo" | "healthcare" | "all";
type VulnType = "sqli" | "lfi" | "admin" | "upload" | "dir" | "backup" | "login" | "xss" | "cms";
type Engine   = "google" | "bing" | "duckduckgo" | "fofa";
type Tab      = "dorks" | "deepsearch" | "results";

interface Dork {
  query: string;
  engine: Engine;
  vuln: VulnType;
  risk: "high" | "medium" | "low";
}

interface FoundTarget {
  domain: string;
  category: string;
  indicator: string;
  source: string;
  status?: string;
  status_code?: number;
  title?: string;
  tech?: string;
  ip?: string;
  final_url?: string;
}

interface FindScan {
  id: string;
  category: string;
  tlds: string[];
  vuln_types: string[];
  status: string;
  total: number;
  created_at: string;
  finished_at?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: Record<Category, { label: string; tlds: string[] }> = {
  gov:        { label: "Government",  tlds: ["*.go.id", "*.gov.id", "*.mil.id"] },
  school:     { label: "School",      tlds: ["*.sch.id"] },
  university: { label: "University",  tlds: ["*.ac.id", "*.edu"] },
  company:    { label: "Company",     tlds: ["*.co.id", "*.com"] },
  ngo:        { label: "NGO / Org",   tlds: ["*.or.id", "*.org"] },
  healthcare: { label: "Healthcare",  tlds: ["*.go.id", "*.co.id"] },
  all:        { label: "All",         tlds: ["*.go.id", "*.sch.id", "*.ac.id", "*.co.id", "*.or.id"] },
};

const VULN_DORKS: Record<VulnType, { label: string; risk: "high" | "medium" | "low"; dorks: string[] }> = {
  sqli:   {
    label: "SQL Injection", risk: "high",
    dorks: [
      'inurl:"?id="', 'inurl:"?cat="', 'inurl:"?item="',
      'inurl:"?produk="', 'inurl:"?berita="',
      '"Warning: mysql"', '"SQL syntax"', '"You have an error in your SQL"',
    ],
  },
  lfi:    {
    label: "LFI / Path Trav", risk: "high",
    dorks: [
      'inurl:"?file="', 'inurl:"?path="', 'inurl:"?include="',
      'inurl:"?template="', 'inurl:"?halaman="', 'inurl:"?mod="',
    ],
  },
  admin:  {
    label: "Admin Panel", risk: "medium",
    dorks: [
      'inurl:"admin/login"', 'inurl:"wp-admin"', 'inurl:"administrator"',
      'inurl:"admin.php"', 'intitle:"Admin Panel"',
      'inurl:"cpanel"', 'inurl:"phpmyadmin"',
    ],
  },
  upload: {
    label: "File Upload", risk: "high",
    dorks: [
      'inurl:"upload.php"', 'inurl:"fileupload"',
      'inurl:"upload" ext:php', 'inurl:"file-manager"',
    ],
  },
  dir:    {
    label: "Dir Listing", risk: "medium",
    dorks: [
      'intitle:"index of"', '"Parent Directory"',
      'intitle:"Index of /" -wiki -faq',
    ],
  },
  backup: {
    label: "Backup / Exposed", risk: "high",
    dorks: [
      'ext:sql', 'ext:bak', 'ext:env',
      '"dump.sql"', 'inurl:"backup" ext:zip',
      'ext:log inurl:error', '"db_backup"',
    ],
  },
  login:  {
    label: "Login Page", risk: "low",
    dorks: [
      'inurl:"login.php"', 'inurl:"signin"',
      'inurl:"login" ext:php', 'intitle:"Login"',
    ],
  },
  xss:    {
    label: "XSS Surface", risk: "medium",
    dorks: [
      'inurl:"?search="', 'inurl:"?q="',
      'inurl:"?keyword="', 'inurl:"?cari="',
    ],
  },
  cms:    {
    label: "CMS / Framework", risk: "medium",
    dorks: [
      'inurl:"wp-content"', 'inurl:"wp-login.php"',
      '"Powered by WordPress"', '"Powered by Laravel"',
      '"CodeIgniter"', 'inurl:"joomla" inurl:"administrator"',
    ],
  },
};

const ENGINES: Record<Engine, { label: string; url: (q: string) => string }> = {
  google:     { label: "Google", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  bing:       { label: "Bing",   url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  duckduckgo: { label: "DDG",    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  fofa:       { label: "Fofa",   url: (q) => `https://fofa.info/result?qbase64=${btoa(q)}` },
};

const RISK_BADGE: Record<string, string> = {
  high:   "bg-red-950 text-red-400 border border-red-800",
  medium: "bg-yellow-950 text-yellow-400 border border-yellow-800",
  low:    "bg-zinc-800 text-zinc-400 border border-zinc-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-zinc-500 transition-colors hover:text-zinc-300"
    >
      <ClipboardDocumentIcon className="h-3 w-3" />
      {copied && <span className="text-[9px] text-green-400">ok</span>}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FindPage() {
  const [tab, setTab] = useState<Tab>("dorks");
  const [category, setCategory] = useState<Category>("gov");
  const [selectedVulns, setSelectedVulns]     = useState<VulnType[]>(["sqli", "admin", "backup"]);
  const [selectedEngines, setSelectedEngines] = useState<Engine[]>(["google"]);
  const [customTld, setCustomTld]             = useState("");

  // DeepSearch
  const [deepRunning, setDeepRunning]   = useState(false);
  const [deepProgress, setDeepProgress] = useState("");
  const [results, setResults]           = useState<FoundTarget[]>([]);
  const [scans, setScans]               = useState<FindScan[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  const loadScans = useCallback(async () => {
    try {
      const data = await fetchFindScans();
      setScans(data);
    } catch { /* daemon offline */ }
  }, []);

  const loadScanTargets = useCallback(async (id: string) => {
    try {
      const data = await fetchFindTargets(id);
      setResults(data);
      setActiveScanId(id);
      setTab("results");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadScans(); }, [loadScans]);

  // crt.sh
  const [crtQuery, setCrtQuery]     = useState("");
  const [crtLoading, setCrtLoading] = useState(false);
  const [crtResults, setCrtResults] = useState<string[]>([]);

  const toggleVuln   = (v: VulnType) =>
    setSelectedVulns((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const toggleEngine = (e: Engine) =>
    setSelectedEngines((p) => p.includes(e) ? p.filter((x) => x !== e) : [...p, e]);

  const tlds = useMemo(() => {
    const base = CATEGORIES[category].tlds;
    return customTld.trim() ? [...base, customTld.trim()] : base;
  }, [category, customTld]);

  const dorks = useMemo<Dork[]>(() => {
    const out: Dork[] = [];
    for (const vuln of selectedVulns) {
      const vd = VULN_DORKS[vuln];
      for (const tld of tlds) {
        for (const dork of vd.dorks) {
          for (const engine of selectedEngines) {
            out.push({ query: `site:${tld} ${dork}`, engine, vuln, risk: vd.risk });
          }
        }
      }
    }
    return out;
  }, [tlds, selectedVulns, selectedEngines]);

  const shodanQueries = useMemo(
    () => tlds.map((t) => `hostname:".${t.replace("*.", "")}"`),
    [tlds]
  );
  const fofaQueries = useMemo(
    () => tlds.map((t) => `domain="${t.replace("*.", "")}"`),
    [tlds]
  );

  const runCrtSearch = useCallback(async () => {
    if (!crtQuery.trim()) return;
    setCrtLoading(true);
    setCrtResults([]);
    try {
      const res  = await fetch(`https://crt.sh/?q=${encodeURIComponent(crtQuery)}&output=json`);
      const data: { name_value: string }[] = await res.json();
      const domains = [...new Set(
        data.flatMap((d) => d.name_value.split("\n")).map((d) => d.replace(/^\*\./, "")).filter(Boolean)
      )].sort();
      setCrtResults(domains);
    } catch {
      setCrtResults(["error: crt.sh unreachable"]);
    }
    setCrtLoading(false);
  }, [crtQuery]);

  const runDeepSearch = useCallback(async () => {
    setDeepRunning(true);
    setDeepProgress("Querying crt.sh + probing targets…");
    setResults([]);
    try {
      const res = await fetch("http://localhost:8080/api/find/deepsearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, tlds, vuln_types: selectedVulns }),
      });
      if (!res.ok) throw new Error(`daemon HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.targets ?? []);
      setActiveScanId(data.scan_id ?? null);
      const errs: string[] = data.errors ?? [];
      if (errs.length > 0) {
        setDeepProgress(`Done — ${data.count ?? 0} targets. Errors: ${errs.join("; ")}`);
      } else {
        setDeepProgress(`Done — ${data.count ?? 0} targets found.`);
      }
      if ((data.count ?? 0) > 0) setTab("results");
      await loadScans();
    } catch (e) {
      setDeepProgress(`Error: ${e instanceof Error ? e.message : "daemon not connected"}`);
    }
    setDeepRunning(false);
  }, [category, tlds, selectedVulns]);

  return (
    <div className="flex h-[calc(100vh-56px)] bg-zinc-950 text-zinc-100">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900">

        {/* Category */}
        <div className="border-b border-zinc-800 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Target Category</p>
          <div className="space-y-0.5">
            {(Object.entries(CATEGORIES) as [Category, { label: string }][]).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`w-full rounded border-l-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                  category === key
                    ? "border-l-fuchsia-500 bg-zinc-800 text-zinc-100"
                    : "border-l-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom TLD */}
        <div className="border-b border-zinc-800 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Custom TLD</p>
          <input
            type="text"
            value={customTld}
            onChange={(e) => setCustomTld(e.target.value)}
            placeholder="*.pemda.go.id"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
          />
        </div>

        {/* Vuln Types */}
        <div className="border-b border-zinc-800 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Vulnerability</p>
          <div className="space-y-0.5">
            {(Object.entries(VULN_DORKS) as [VulnType, { label: string; risk: string }][]).map(([key, { label, risk }]) => (
              <button
                key={key}
                onClick={() => toggleVuln(key)}
                className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selectedVulns.includes(key)
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                <span>{label}</span>
                <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${RISK_BADGE[risk]}`}>{risk}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Engines */}
        <div className="p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Engine</p>
          <div className="space-y-0.5">
            {(Object.entries(ENGINES) as [Engine, { label: string }][]).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => toggleEngine(key)}
                className={`w-full rounded border-l-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selectedEngines.includes(key)
                    ? "border-l-fuchsia-500 bg-zinc-800 text-zinc-100"
                    : "border-l-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-900 px-4">
          {([
            { id: "dorks"      as Tab, label: `Dorks (${dorks.length})` },
            { id: "deepsearch" as Tab, label: "DeepSearch" },
            { id: "results"    as Tab, label: `Results (${results.length})` },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "border-b-fuchsia-500 text-zinc-100"
                  : "border-b-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto py-2">
            <span className="font-mono text-[10px] text-zinc-600">{tlds.join("  ·  ")}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">

          {/* ── Dorks tab ─────────────────────────────────────────────── */}
          {tab === "dorks" && (
            <div className="space-y-4">
              {dorks.length === 0 && (
                <p className="text-xs text-zinc-600">Select at least one vulnerability type and engine.</p>
              )}
              {selectedVulns.map((vuln) => {
                const vulnDorks = dorks.filter((d) => d.vuln === vuln);
                if (!vulnDorks.length) return null;
                const vd = VULN_DORKS[vuln];
                return (
                  <div key={vuln} className="rounded border border-zinc-800">
                    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{vd.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${RISK_BADGE[vd.risk]}`}>{vd.risk}</span>
                      <span className="ml-auto text-[10px] text-zinc-600">{vulnDorks.length} queries</span>
                      <CopyBtn text={vulnDorks.map((d) => d.query).join("\n")} />
                    </div>
                    <div className="divide-y divide-zinc-800/60">
                      {vulnDorks.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-900 px-3 py-2 hover:bg-zinc-800/50">
                          <span className="w-12 shrink-0 text-[9px] font-bold uppercase text-zinc-600">
                            {ENGINES[d.engine].label}
                          </span>
                          <code className="flex-1 truncate font-mono text-[11px] text-zinc-300">{d.query}</code>
                          <div className="flex gap-1">
                            <CopyBtn text={d.query} />
                            <a
                              href={ENGINES[d.engine].url(d.query)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center rounded border border-zinc-700 bg-zinc-800 p-1 text-zinc-500 transition-colors hover:text-zinc-300"
                            >
                              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── DeepSearch tab ────────────────────────────────────────── */}
          {tab === "deepsearch" && (
            <div className="space-y-4">

              {/* Scan History */}
              {scans.length > 0 && (
                <div className="rounded border border-zinc-800">
                  <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                    <ClockIcon className="h-3 w-3 text-zinc-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Scan History</span>
                    <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{scans.length}</span>
                  </div>
                  <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto">
                    {scans.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => loadScanTargets(s.id)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-800/50 ${
                          activeScanId === s.id ? "bg-zinc-800" : "bg-zinc-900"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-300">{s.category}</span>
                            <span className="font-mono text-[10px] text-zinc-600">{s.tlds.join(", ")}</span>
                          </div>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            {new Date(s.created_at).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                          </p>
                        </div>
                        <span className="shrink-0 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                          {s.total}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* crt.sh */}
              <div className="rounded border border-zinc-800">
                <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">crt.sh — Certificate Transparency</span>
                  <span className="rounded border border-blue-800 bg-blue-950 px-1.5 py-0.5 text-[9px] text-blue-400">live</span>
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={crtQuery}
                      onChange={(e) => setCrtQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runCrtSearch()}
                      placeholder="%.go.id  or  %.sch.id  or  target.com"
                      className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
                    />
                    <button
                      onClick={runCrtSearch}
                      disabled={crtLoading || !crtQuery.trim()}
                      className="flex items-center gap-1.5 rounded bg-fuchsia-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-fuchsia-600 disabled:opacity-50"
                    >
                      <MagnifyingGlassIcon className="h-3 w-3" />
                      {crtLoading ? "Searching…" : "Search"}
                    </button>
                  </div>
                  {/* Quick TLD chips */}
                  <div className="flex flex-wrap gap-1">
                    {tlds.map((tld) => (
                      <button
                        key={tld}
                        onClick={() => setCrtQuery(tld.replace("*", "%"))}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400 transition-colors hover:text-zinc-200"
                      >
                        {tld.replace("*", "%")}
                      </button>
                    ))}
                  </div>
                  {crtResults.length > 0 && (
                    <div className="max-h-72 overflow-y-auto rounded border border-zinc-800 bg-zinc-950">
                      <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
                        <span className="text-[10px] text-zinc-500">{crtResults.length} domains</span>
                        <CopyBtn text={crtResults.join("\n")} />
                      </div>
                      {crtResults.map((d, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-zinc-800/40 px-3 py-1.5 hover:bg-zinc-800/30">
                          <code className="font-mono text-[11px] text-zinc-300">{d}</code>
                          <a
                            href={`https://${d}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-600 hover:text-zinc-400"
                          >
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Shodan */}
              <div className="rounded border border-zinc-800">
                <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Shodan Queries</span>
                </div>
                <div className="divide-y divide-zinc-800/60">
                  {shodanQueries.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 bg-zinc-900 px-3 py-2 hover:bg-zinc-800/50">
                      <code className="flex-1 font-mono text-[11px] text-zinc-300">{q}</code>
                      <CopyBtn text={q} />
                      <a
                        href={`https://www.shodan.io/search?query=${encodeURIComponent(q)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center rounded border border-zinc-700 bg-zinc-800 p-1 text-zinc-500 transition-colors hover:text-zinc-300"
                      >
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fofa */}
              <div className="rounded border border-zinc-800">
                <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Fofa Queries</span>
                </div>
                <div className="divide-y divide-zinc-800/60">
                  {fofaQueries.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 bg-zinc-900 px-3 py-2 hover:bg-zinc-800/50">
                      <code className="flex-1 font-mono text-[11px] text-zinc-300">{q}</code>
                      <CopyBtn text={q} />
                      <a
                        href={`https://fofa.info/result?qbase64=${btoa(q)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center rounded border border-zinc-700 bg-zinc-800 p-1 text-zinc-500 transition-colors hover:text-zinc-300"
                      >
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daemon DeepSearch */}
              <div className="rounded border border-zinc-800">
                <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Daemon DeepSearch</span>
                  <span className="rounded border border-fuchsia-800 bg-fuchsia-950 px-1.5 py-0.5 text-[9px] text-fuchsia-400">automated</span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-[10px] text-zinc-600">
                    Multi-source automated OSINT via daemon. Requires daemon at localhost:8080.
                  </p>
                  <button
                    onClick={runDeepSearch}
                    disabled={deepRunning}
                    className="flex items-center gap-1.5 rounded bg-fuchsia-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-fuchsia-600 disabled:opacity-50"
                  >
                    <BoltIcon className="h-3 w-3" />
                    {deepRunning ? "Scanning…" : "Run DeepSearch"}
                  </button>
                  {deepProgress && (
                    <p className="font-mono text-[10px] text-zinc-500">{deepProgress}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Results tab ───────────────────────────────────────────── */}
          {tab === "results" && (
            results.length === 0 ? (
              <p className="text-xs text-zinc-600">No results yet. Run DeepSearch or load a past scan.</p>
            ) : (
              <div className="space-y-1">
                {/* Summary bar */}
                <div className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {results.length} targets
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-[10px] text-green-400">
                    {results.filter((r) => r.status === "online").length} online
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-[10px] text-zinc-500">
                    {results.filter((r) => r.status === "offline").length} offline
                  </span>
                  <span className="ml-auto text-[10px] text-zinc-600 font-mono">
                    {activeScanId?.slice(0, 8)}
                  </span>
                </div>

                {/* Results rows */}
                <div className="overflow-hidden rounded border border-zinc-800">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="group border-b border-zinc-800/60 bg-zinc-900 px-3 py-2.5 hover:bg-zinc-800/40 transition-colors last:border-b-0"
                    >
                      {/* Row 1: domain + status + code */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          r.status === "online"
                            ? "bg-green-950 text-green-400 border border-green-800"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                        }`}>
                          {r.status ?? "—"}
                        </span>
                        {r.status_code != null && r.status_code > 0 && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                            r.status_code < 300 ? "bg-green-950 text-green-400 border border-green-800"
                            : r.status_code < 400 ? "bg-blue-950 text-blue-400 border border-blue-800"
                            : r.status_code < 500 ? "bg-yellow-950 text-yellow-500 border border-yellow-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                          }`}>
                            {r.status_code}
                          </span>
                        )}
                        <a
                          href={r.final_url || `https://${r.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-zinc-200 hover:text-fuchsia-400 transition-colors truncate"
                        >
                          {r.domain}
                        </a>
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                          <CopyBtn text={r.domain} />
                          <a
                            href={r.final_url || `https://${r.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center rounded border border-zinc-700 bg-zinc-800 p-1 text-zinc-500 transition-colors hover:text-zinc-300"
                          >
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {/* Row 2: title */}
                      {r.title && (
                        <p className="mb-1 truncate text-[11px] text-zinc-400 pl-1">
                          {r.title}
                        </p>
                      )}

                      {/* Row 3: meta chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pl-1">
                        {r.ip && (
                          <span className="font-mono text-[10px] text-zinc-600">{r.ip}</span>
                        )}
                        {r.ip && (r.tech || r.source) && (
                          <span className="text-zinc-700">·</span>
                        )}
                        {r.tech && r.tech.split(", ").filter(Boolean).map((t) => (
                          <span key={t} className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">
                            {t}
                          </span>
                        ))}
                        {r.source && (
                          <span className="ml-auto text-[10px] text-zinc-700 truncate">{r.source}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}
