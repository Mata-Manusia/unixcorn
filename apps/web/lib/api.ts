import { authHeaders, logout } from "./auth";

const BASE = "http://localhost:8080/api";

async function authedFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeaders(),
    },
  });
  if (res.status === 401) {
    logout();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  return res;
}

async function authedJSON(url: string, init?: RequestInit) {
  const res = await authedFetch(url, init);
  return res.json();
}

export async function fetchScans() {
  return authedJSON(`${BASE}/recon`);
}

export async function startScan(
  target: string,
  tools?: string[],
  opts?: { nuclei_tags?: string[]; severity?: string[]; update_templates?: boolean }
) {
  return authedJSON(`${BASE}/recon/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, tools, ...(opts || {}) }),
  });
}

export async function fetchScanResults(id: string) {
  return authedJSON(`${BASE}/recon/${id}/results`);
}

export async function fetchLogs(scanId?: string) {
  const url = scanId ? `${BASE}/logs?scan_id=${scanId}` : `${BASE}/logs`;
  return authedJSON(url);
}

export async function fetchPlugins() {
  return authedJSON(`${BASE}/plugins`);
}

export async function startExploit(target: string, phases = "1,2,3,4") {
  return authedJSON(`${BASE}/exploit/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, phases }),
  });
}

export async function fetchExploitScans() {
  return authedJSON(`${BASE}/exploit`);
}

export async function fetchExploitVulns(id: string) {
  return authedJSON(`${BASE}/exploit/${id}/vulns`);
}

export async function stopScan(id: string) {
  return authedJSON(`${BASE}/recon/${id}/stop`, { method: "POST" });
}

export async function stopExploit(id: string) {
  return authedJSON(`${BASE}/exploit/${id}/stop`, { method: "POST" });
}

export async function fetchFindScans() {
  return authedJSON(`${BASE}/find/scans`);
}

export async function fetchFindTargets(id: string) {
  return authedJSON(`${BASE}/find/${id}/targets`);
}

export async function startDeepSearch(category: string, tlds: string[], vulnTypes: string[]) {
  const res = await authedFetch(`${BASE}/find/deepsearch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, tlds, vuln_types: vulnTypes }),
  });
  return res.json();
}
