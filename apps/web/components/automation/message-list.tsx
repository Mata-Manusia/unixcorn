"use client";

import { SparklesIcon, UserIcon, BeakerIcon } from "@heroicons/react/24/outline";
import type { ChatMessageDisplay } from "./chat";

interface Props {
  messages: ChatMessageDisplay[];
  error: string | null;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, error, bottomRef }: Props) {
  if (messages.length === 0 && !error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-zinc-600 select-none">
        <BeakerIcon className="mb-4 h-12 w-12 text-zinc-700" />
        <p className="text-lg font-semibold text-zinc-500">Unixcorn Automation</p>
        <p className="mt-1 text-xs text-zinc-600">
          AI-powered penetration testing assistant
        </p>
        <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
          {[
            "Scan target for open ports",
            "Find SQL injection vulnerabilities",
            "Enumerate subdomains for example.com",
            "Generate XSS payload",
            "Check for common misconfigurations",
          ].map((hint) => (
            <span
              key={hint}
              className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-500"
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            {/* Avatar */}
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
              {msg.role === "user" ? (
                <UserIcon className="h-4 w-4 text-zinc-400" />
              ) : msg.role === "tool" ? (
                <BeakerIcon className="h-4 w-4 text-amber-400" />
              ) : (
                <SparklesIcon className="h-4 w-4 text-fuchsia-400" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                {msg.role === "user" ? "You" : msg.role === "tool" ? "Tool" : "Unixcorn AI"}
              </p>

              {/* Text content */}
              {msg.content && (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200 font-mono">
                  {msg.content}
                </div>
              )}

              {/* Tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.toolCalls.map((tc, i) => (
                    <div
                      key={i}
                      className="rounded border border-zinc-700/50 bg-zinc-800/50 px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold text-fuchsia-400">
                        ⚡ {tc.name}
                      </p>
                      <pre className="mt-1 text-[11px] text-zinc-400 overflow-x-auto">
                        {JSON.stringify(tc.args, null, 1)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Tool results (from assistant messages) */}
              {msg.toolResults && msg.toolResults.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.toolResults.map((tr, i) => (
                    <div
                      key={i}
                      className="rounded border border-zinc-700/50 bg-zinc-900 px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold text-emerald-400">
                        ✓ {tr.name}
                      </p>
                      <pre className="mt-1 text-[11px] text-zinc-400 overflow-x-auto max-h-40 overflow-y-auto">
                        {tr.result}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
