import { useStore } from "./store";
import type { ExploitVuln } from "./store";

const DAEMON_WS = "ws://localhost:8080/ws";

let socket: WebSocket | null = null;

export function connectWS() {
  if (socket?.readyState === WebSocket.OPEN) return;

  socket = new WebSocket(DAEMON_WS);

  socket.onopen = () => {
    useStore.getState().setWsConnected(true);
  };

  socket.onclose = () => {
    useStore.getState().setWsConnected(false);
    setTimeout(connectWS, 3000);
  };

  socket.onmessage = (e) => {
    try {
      const ev = JSON.parse(e.data);
      const store = useStore.getState();

      switch (ev.type) {
        // ---- recon events ----
        case "scan.started":
          store.addLog({
            id: Date.now(), scan_id: ev.scan_id, level: "info",
            message: `Scan started: ${ev.message}`,
            timestamp: new Date().toISOString(),
          });
          break;

        case "scan.log":
          store.addLog({
            id: Date.now(), scan_id: ev.scan_id,
            level: ev.tool === "error" ? "error" : "info",
            message: `[${ev.tool}] ${ev.message}`,
            timestamp: new Date().toISOString(),
          });
          break;

        case "scan.stopped":
          store.updateScanStatus(ev.scan_id, "stopped");
          break;

        case "scan.completed":
          store.updateScanStatus(ev.scan_id, "completed");
          store.addLog({
            id: Date.now(), scan_id: ev.scan_id, level: "info",
            message: `Scan completed: ${ev.scan_id}`,
            timestamp: new Date().toISOString(),
          });
          break;

        // ---- exploit events ----
        case "exploit.started":
          store.addLog({
            id: Date.now(), scan_id: ev.scan_id, level: "info",
            message: `Exploit scan started: ${ev.message}`,
            timestamp: new Date().toISOString(),
          });
          break;

        case "exploit.log":
          store.addLog({
            id: Date.now(), scan_id: ev.scan_id, level: "info",
            message: ev.message,
            timestamp: new Date().toISOString(),
          });
          break;

        case "exploit.progress":
          store.addLog({
            id: Date.now(), scan_id: ev.scan_id, level: "info",
            message: `[progress] ${ev.message}`,
            timestamp: new Date().toISOString(),
          });
          break;

        case "exploit.vuln":
          if (ev.data && ev.scan_id === store.activeExploitScanId) {
            store.addExploitVuln({
              id: Date.now(),
              scan_id: ev.scan_id,
              ...ev.data,
              timestamp: new Date().toISOString(),
            } as ExploitVuln);
          }
          break;

        case "exploit.stopped":
          store.updateExploitStatus(ev.scan_id, "stopped");
          break;

        case "exploit.completed":
          store.updateExploitStatus(ev.scan_id, "completed");
          store.addLog({
            id: Date.now(), scan_id: ev.scan_id, level: "info",
            message: `Exploit scan completed: ${ev.scan_id}`,
            timestamp: new Date().toISOString(),
          });
          break;
      }
    } catch {
      // ignore malformed
    }
  };
}
