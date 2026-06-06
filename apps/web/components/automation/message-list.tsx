"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SparklesIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { ChatMessageDisplay, ToolCallEvent, ToolResultEvent } from "./chat";

interface Props {
  messages: ChatMessageDisplay[];
  error: string | null;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onPromptClick?: (prompt: string) => void;
  streaming?: boolean;
}

const SUGGESTED = [
  "Scan target for open ports",
  "Find SQL injection vulnerabilities",
  "Enumerate subdomains for example.com",
  "Generate XSS payload",
  "Check for common misconfigurations",
];

function CommandBlock({ call, result }: { call: ToolCallEvent; result?: ToolResultEvent }) {
  const [open, setOpen] = useState(false);
  const cmd = typeof call.args?.command === "string"
    ? call.args.command
    : call.name;
  const preview = cmd.slice(0, 80);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-zinc-800/60 transition-colors"
      >
        <span className="shrink-0 text-[10px] text-zinc-600">{result ? "✓" : "·"}</span>
        <span className="flex-1 truncate text-[10px] font-mono text-zinc-500">{preview}</span>
        <span className="shrink-0 text-[10px] text-zinc-700">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-1">
          <pre className="overflow-x-auto rounded bg-zinc-800/60 px-2 py-1.5 text-[10px] text-zinc-400 whitespace-pre-wrap">
            {JSON.stringify(call.args, null, 2)}
          </pre>
          {result && (
            <pre className="max-h-48 overflow-y-auto overflow-x-auto rounded bg-zinc-900/60 px-2 py-1.5 text-[10px] text-zinc-500 whitespace-pre-wrap">
              {result.result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ToolActivityGroup({
  toolCalls,
  toolResults,
  streaming,
}: {
  toolCalls: ToolCallEvent[];
  toolResults: ToolResultEvent[];
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const total = toolCalls.length;
  const done = toolResults.length;
  const running = streaming && done < total;

  return (
    <div className="my-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700/30 bg-zinc-800/30 px-2.5 py-1.5 text-left transition-colors hover:bg-zinc-800/60"
      >
        {running ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
        ) : (
          <span className="text-[10px] text-amber-400">⚡</span>
        )}
        <span className="text-[11px] text-zinc-400">
          {running ? `${done}/${total}` : total} command{total !== 1 ? "s" : ""}
          {running ? " running..." : " completed"}
        </span>
        <span className="ml-2 text-[10px] text-zinc-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-1 rounded-lg border border-zinc-700/20 bg-zinc-900/40 px-1 py-1">
          {toolCalls.map((tc, i) => (
            <CommandBlock key={i} call={tc} result={toolResults[i]} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkingBlock({ content, done }: { content: string; done: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        {done ? (
          open ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />
        ) : (
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        )}
        <span className="italic">{done ? "Thought" : "Thinking..."}</span>
      </button>

      {open && done && content && (
        <div className="mt-1.5 rounded-xl border border-zinc-700/40 bg-zinc-800/30 px-3 py-2.5 text-[12px] text-zinc-500 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1 py-1">
      <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-zinc-200 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
          h1: ({ children }) => <h1 className="text-lg font-bold text-zinc-100 mb-2 mt-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-zinc-100 mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-zinc-100 mb-1 mt-2">{children}</h3>,
          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-200">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            return isBlock
              ? <code className={`block text-xs font-mono text-zinc-200 ${className}`}>{children}</code>
              : <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs font-mono text-fuchsia-300">{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-xs">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-fuchsia-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-zinc-600 pl-3 text-zinc-400 italic">{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-zinc-700" />,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-800/80">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-zinc-700/40 even:bg-zinc-800/20">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-zinc-700/50 px-3 py-1.5 text-left font-semibold text-zinc-200 text-[11px]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-700/30 px-3 py-1.5 text-zinc-400 text-[11px]">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function MessageList({ messages, error, bottomRef, onPromptClick, streaming }: Props) {
  if (messages.length === 0 && !error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 select-none">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
          <SparklesIcon className="h-5 w-5 text-fuchsia-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">What can I help with?</h2>
        <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
          {SUGGESTED.map((hint) => (
            <button
              key={hint}
              onClick={() => onPromptClick?.(hint)}
              className="rounded-full border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {messages.map((msg, idx) => {
          const isLastAssistant = msg.role === "assistant" && idx === messages.length - 1;

          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-zinc-700 px-4 py-3 text-sm text-zinc-100 whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.role === "tool") {
            // Tool results are shown inside the assistant message's ToolActivityGroup
            return null;
          }

          // assistant
          // Only show loading dots when neither thinking nor content has started
          const isWaiting = isLastAssistant && streaming && !msg.content && !msg.thinkingStarted && !msg.thinking;

          return (
            <div key={msg.id} className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-600/20">
                <SparklesIcon className="h-4 w-4 text-fuchsia-400" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {/* Thinking block — only when thinking actually started */}
                {(msg.thinkingStarted || msg.thinking) && (
                  <ThinkingBlock
                    content={msg.thinking || ""}
                    done={!!msg.thinkingDone}
                  />
                )}

                {/* Loading dots — waiting for first token, no thinking */}
                {isWaiting && <LoadingDots />}

                {/* Content */}
                {msg.content && <MarkdownContent content={msg.content} />}

                {/* Tool activity — all calls grouped into one block */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <ToolActivityGroup
                    toolCalls={msg.toolCalls}
                    toolResults={msg.toolResults || []}
                    streaming={isLastAssistant && streaming}
                  />
                )}

                {/* Model refusal hint */}
                {msg.hint && (
                  <div className="mt-2 rounded-xl border border-amber-700/40 bg-amber-950/30 px-3 py-2.5 text-xs text-amber-300">
                    {msg.hint}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-sm text-red-400">!</div>
            <div className="flex-1 rounded-xl border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
