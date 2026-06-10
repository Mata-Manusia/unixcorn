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

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
}

export interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

export function chatStream(
  messages: ChatMessage[],
  model = "openai/gpt-4o",
  onEvent?: (ev: any) => void,
  signal?: AbortSignal,
  sessionId?: number,
  target?: string
): Promise<void> {
  return fetch(`${BASE}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ messages, model, session_id: sessionId ?? 0, target: target ?? "" }),
    signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "chat request failed");
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const ev = JSON.parse(json);
            onEvent?.(ev);
          } catch {
            // ignore malformed
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") throw err;
      // AbortError is expected on stream cancel — swallow silently
    }
  });
}

export async function checkSessionActive(sessionId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/ai/sessions/${sessionId}/active`, {
      headers: authHeaders(),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.active === true;
  } catch {
    return false;
  }
}

export function streamSessionEvents(
  sessionId: number,
  onEvent: (ev: any) => void,
  signal?: AbortSignal
): Promise<void> {
  return fetch(`${BASE}/ai/sessions/${sessionId}/stream`, {
    headers: authHeaders(),
    signal,
  }).then(async (res) => {
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const ev = JSON.parse(json);
            onEvent(ev);
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") throw err;
    }
  }).catch((err: any) => {
    // fetch() itself throws AbortError when signal fires before response
    if (err?.name !== "AbortError") throw err;
  });
}

export interface AIConfig {
  base_url: string;
  model: string;
  api_key?: string;
}

export async function getAIConfig(): Promise<{ configured: boolean; config?: AIConfig }> {
  return authedJSON(`${BASE}/ai/config`);
}

export async function saveAIConfig(cfg: AIConfig) {
  return authedJSON(`${BASE}/ai/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg),
  });
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: number;
  session_id: number;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: string;
  created_at: string;
}

export async function listSessions(): Promise<ChatSession[]> {
  return authedJSON(`${BASE}/ai/sessions`);
}

export async function createSession(title?: string): Promise<{ id: number; title: string }> {
  return authedJSON(`${BASE}/ai/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || "New Chat" }),
  });
}

export async function getSessionMessages(id: number): Promise<SessionMessage[]> {
  return authedJSON(`${BASE}/ai/sessions/${id}/messages`);
}

export async function deleteSession(id: number): Promise<void> {
  return authedJSON(`${BASE}/ai/sessions/${id}`, { method: "DELETE" });
}

export async function updateSessionTitle(id: number, title: string): Promise<void> {
  return authedJSON(`${BASE}/ai/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export interface ResourceFile {
  name: string;
  title: string;
}

export async function listResources(): Promise<ResourceFile[]> {
  const data = await authedJSON(`${BASE}/resources`);
  return data.files || [];
}

export async function getResource(name: string): Promise<{ name: string; title: string; content: string }> {
  return authedJSON(`${BASE}/resources/${encodeURIComponent(name)}`);
}

export interface WorkspaceFile {
  name: string;
  size: number;
  mod_time: string;
  is_dir: boolean;
}

export async function stopSession(id: number): Promise<void> {
  await authedFetch(`${BASE}/ai/sessions/${id}/stop`, { method: "POST" });
}

export async function listWorkspaceFiles(sessionId: number): Promise<{ files: WorkspaceFile[]; workspace: string }> {
  const data = await authedJSON(`${BASE}/ai/sessions/${sessionId}/workspace`);
  return { files: data.files || [], workspace: data.workspace || "" };
}

export async function getWorkspaceFile(sessionId: number, filename: string): Promise<{ name: string; content: string; size: number }> {
  return authedJSON(`${BASE}/ai/sessions/${sessionId}/workspace/${encodeURIComponent(filename)}`);
}

export async function startDeepSearch(category: string, tlds: string[], vulnTypes: string[]) {
  const res = await authedFetch(`${BASE}/find/deepsearch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, tlds, vuln_types: vulnTypes }),
  });
  return res.json();
}
