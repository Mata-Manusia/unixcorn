"use client";

import { BeakerIcon, GlobeAltIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import type { ChatMessageDisplay } from "./chat";

interface Props {
  messages: ChatMessageDisplay[];
}

export function Sidebar({ messages }: Props) {
  // Extract tool calls and results
  const toolHistory = messages
    .filter((m) => m.toolCalls && m.toolCalls.length > 0)
    .flatMap((m) =>
      (m.toolCalls || []).map((tc, i) => ({
        ...tc,
        result: m.toolResults?.[i]?.result || null,
      }))
    );

  const fileOps = toolHistory.filter(
    (t) => t.name === "file_read" || t.name === "file_write"
  );
  const terminalOps = toolHistory.filter(
    (t) => t.name === "run_terminal_cmd"
  );
  const webOps = toolHistory.filter(
    (t) => t.name === "web_search" || t.name === "open_url"
  );

  if (messages.length === 0) {
    return (
      <aside className="hidden w-64 shrink-0 border-l border-zinc-800 bg-zinc-900/50 lg:flex lg:flex-col">
        <div className="flex items-center justify-center flex-1 text-zinc-600">
          <p className="text-[11px]">Tool output appears here</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 border-l border-zinc-800 bg-zinc-900/50 overflow-y-auto lg:flex lg:flex-col">
      <div className="border-b border-zinc-800 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Activity
        </p>
      </div>

      <div className="flex-1 space-y-3 p-3">
        {/* Terminal commands */}
        {terminalOps.length > 0 && (
          <Section title="Terminal" count={terminalOps.length} icon={<BeakerIcon className="h-3 w-3" />}>
            {terminalOps.slice(-5).reverse().map((op, i) => (
              <div key={i} className="rounded border border-zinc-700/30 bg-zinc-800/30 px-2 py-1.5">
                <p className="truncate text-[11px] font-mono text-zinc-300">
                  $ {String(op.args?.command || "").slice(0, 60)}
                </p>
                {op.result && (
                  <pre className="mt-0.5 max-h-16 overflow-y-auto text-[10px] text-zinc-500">
                    {op.result.slice(0, 200)}
                  </pre>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Web searches */}
        {webOps.length > 0 && (
          <Section title="Web" count={webOps.length} icon={<GlobeAltIcon className="h-3 w-3" />}>
            {webOps.slice(-3).reverse().map((op, i) => (
              <div key={i} className="rounded border border-zinc-700/30 bg-zinc-800/30 px-2 py-1.5">
                <p className="truncate text-[11px] font-mono text-zinc-300">
                  {op.name === "web_search"
                    ? String(op.args?.query || "")
                    : String(op.args?.url || "")}
                </p>
              </div>
            ))}
          </Section>
        )}

        {/* File ops */}
        {fileOps.length > 0 && (
          <Section title="Files" count={fileOps.length} icon={<DocumentTextIcon className="h-3 w-3" />}>
            {fileOps.slice(-3).reverse().map((op, i) => (
              <div key={i} className="rounded border border-zinc-700/30 bg-zinc-800/30 px-2 py-1.5">
                <p className="truncate text-[11px] font-mono text-zinc-300">
                  {op.name === "file_read" ? "📖 " : "✏️ "}
                  {String(op.args?.path || "").split("/").pop()}
                </p>
              </div>
            ))}
          </Section>
        )}

        {toolHistory.length === 0 && (
          <p className="text-[11px] text-zinc-600 text-center pt-4">
            No tool activity yet
          </p>
        )}
      </div>
    </aside>
  );
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-zinc-500">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-zinc-600">({count})</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
