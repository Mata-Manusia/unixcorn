import { create } from "zustand";

export type ScanStatus = "pending" | "running" | "completed" | "failed" | "stopped";

export interface Scan {
  id: string;
  target: string;
  status: ScanStatus;
  created_at: string;
  finished_at?: string;
}

export interface LogEntry {
  id: number;
  scan_id?: string;
  level: "info" | "error" | "warn";
  message: string;
  timestamp: string;
}

export type VulnSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface AttackChainStep {
  target: string;
  payload: string;
  status: string;
  extract?: string;
}

export interface ExploitCode {
  guide?: string;
  curl?: string;
  python?: string;
  http?: string;
}

export interface ExploitVuln {
  id: number;
  scan_id: string;
  severity: VulnSeverity;
  name: string;
  endpoint: string;
  description?: string;
  poc?: string;
  cve?: string;
  cves?: string[];        // multiple CVE IDs
  cvss?: string;
  evidence?: string;
  impact?: string;
  cwe?: string;
  owasp?: string;
  remediation?: string;
  refs?: string;          // JSON string of string[]
  attack_chain?: string;  // JSON string of AttackChainStep[]
  exploit_code?: string;  // JSON string of ExploitCode
  nuclei?: string;        // nuclei template path
  exploit_hint?: string;  // one-line exploit technique
  timestamp: string;
}

export interface ExploitScan {
  id: string;
  target: string;
  phases: string;
  status: ScanStatus;
  created_at: string;
  finished_at?: string;
}

interface UnixcornStore {
  scans: Scan[];
  logs: LogEntry[];
  wsConnected: boolean;
  exploitScans: ExploitScan[];
  exploitVulns: ExploitVuln[];
  activeExploitScanId: string | null;

  setScans: (scans: Scan[]) => void;
  addLog: (log: LogEntry) => void;
  setWsConnected: (v: boolean) => void;
  updateScanStatus: (id: string, status: ScanStatus) => void;

  setExploitScans: (scans: ExploitScan[]) => void;
  addExploitScan: (scan: ExploitScan) => void;
  updateExploitStatus: (id: string, status: ScanStatus) => void;
  setExploitVulns: (vulns: ExploitVuln[]) => void;
  addExploitVuln: (vuln: ExploitVuln) => void;
  setActiveExploitScan: (id: string | null) => void;
}

export const useStore = create<UnixcornStore>((set) => ({
  scans: [],
  logs: [],
  wsConnected: false,
  exploitScans: [],
  exploitVulns: [],
  activeExploitScanId: null,

  setScans: (scans) => set({ scans }),
  addLog: (log) =>
    set((s) => ({ logs: [log, ...s.logs].slice(0, 500) })),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  updateScanStatus: (id, status) =>
    set((s) => ({
      scans: s.scans.map((sc) => (sc.id === id ? { ...sc, status } : sc)),
    })),

  setExploitScans: (exploitScans) => set({ exploitScans }),
  addExploitScan: (scan) =>
    set((s) => ({ exploitScans: [scan, ...s.exploitScans] })),
  updateExploitStatus: (id, status) =>
    set((s) => ({
      exploitScans: s.exploitScans.map((sc) =>
        sc.id === id ? { ...sc, status } : sc
      ),
    })),
  setExploitVulns: (exploitVulns) => set({ exploitVulns }),
  addExploitVuln: (vuln) =>
    set((s) => ({ exploitVulns: [vuln, ...s.exploitVulns] })),
  setActiveExploitScan: (id) => set({ activeExploitScanId: id, exploitVulns: [] }),
}));
