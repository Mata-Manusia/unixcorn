const BASE = "http://localhost:8080/api";

export async function fetchScans() {
  const res = await fetch(`${BASE}/recon`);
  return res.json();
}

export async function startScan(target: string, tools?: string[]) {
  const res = await fetch(`${BASE}/recon/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, tools }),
  });
  return res.json();
}

export async function fetchScanResults(id: string) {
  const res = await fetch(`${BASE}/recon/${id}/results`);
  return res.json();
}

export async function fetchLogs(scanId?: string) {
  const url = scanId ? `${BASE}/logs?scan_id=${scanId}` : `${BASE}/logs`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchPlugins() {
  const res = await fetch(`${BASE}/plugins`);
  return res.json();
}

export async function startExploit(target: string, phases = "1,2,3,4") {
  const res = await fetch(`${BASE}/exploit/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, phases }),
  });
  return res.json();
}

export async function fetchExploitScans() {
  const res = await fetch(`${BASE}/exploit`);
  return res.json();
}

export async function fetchExploitVulns(id: string) {
  const res = await fetch(`${BASE}/exploit/${id}/vulns`);
  return res.json();
}

export async function stopScan(id: string) {
  const res = await fetch(`${BASE}/recon/${id}/stop`, { method: "POST" });
  return res.json();
}

export async function stopExploit(id: string) {
  const res = await fetch(`${BASE}/exploit/${id}/stop`, { method: "POST" });
  return res.json();
}
