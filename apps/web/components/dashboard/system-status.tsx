interface SystemStatusProps {
  wsConnected: boolean;
  activeScans: number;
}

interface StatusRowProps {
  label: string;
  subtitle: string;
  online: boolean;
}

function StatusRow({ label, subtitle, online }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-800/50 px-3 py-2.5">
      <div>
        <p className="text-xs font-medium text-zinc-300">{label}</p>
        <p className="text-[10px] text-zinc-600">{subtitle}</p>
      </div>
      <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-zinc-600"}`} />
    </div>
  );
}

export function SystemStatus({ wsConnected, activeScans }: SystemStatusProps) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-2.5">
        <p className="text-xs font-semibold text-zinc-300">System Status</p>
        <p className="text-[10px] text-zinc-600">Daemon & service overview</p>
      </div>

      <div className="p-3 space-y-2">
        <StatusRow
          label="WebSocket"
          subtitle={wsConnected ? "Connected" : "Disconnected"}
          online={wsConnected}
        />
        <StatusRow
          label="Go Daemon"
          subtitle="localhost:8080"
          online={wsConnected}
        />
        <StatusRow
          label="Worker Queue"
          subtitle={activeScans > 0 ? `${activeScans} job(s) running` : "Idle"}
          online={true}
        />

        <div className="rounded border border-fuchsia-800 bg-fuchsia-950 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-fuchsia-500 uppercase tracking-wider">Active Scans</p>
              <h2 className="mt-1 text-2xl font-bold text-fuchsia-200">{activeScans}</h2>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-7 w-7 text-fuchsia-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
