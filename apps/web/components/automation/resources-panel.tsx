"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { listResources, getResource, type ResourceFile } from "@/lib/api";
import { XMarkIcon, DocumentTextIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface Props {
  onClose: () => void;
}

function humanTitle(raw: string): string {
  return raw
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ResourcesPanel({ onClose }: Props) {
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    listResources()
      .then((f) => {
        setFiles(f);
        if (f.length > 0) loadFile(f[0].name);
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  const loadFile = async (name: string) => {
    setSelected(name);
    setLoading(true);
    try {
      const r = await getResource(name);
      setContent(r.content);
    } catch {
      setContent("_Failed to load resource._");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4 text-fuchsia-400" />
          <span className="text-sm font-semibold text-zinc-200">Resources</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* File tabs */}
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-800 px-2 py-1.5">
        {loadingList ? (
          <span className="text-[11px] text-zinc-600 px-1">Loading...</span>
        ) : files.length === 0 ? (
          <span className="text-[11px] text-zinc-600 px-1">No resources found</span>
        ) : (
          files.map((f) => (
            <button
              key={f.name}
              onClick={() => loadFile(f.name)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                selected === f.name
                  ? "bg-fuchsia-600/20 text-fuchsia-300"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {humanTitle(f.title)}
            </button>
          ))
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-600">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-zinc-300 break-words">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 text-zinc-300">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                em: ({ children }) => <em className="italic text-zinc-400">{children}</em>,
                h1: ({ children }) => <h1 className="text-base font-bold text-zinc-100 mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold text-fuchsia-300 mb-2 mt-4 first:mt-0 border-b border-zinc-800 pb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-bold text-zinc-200 mb-1 mt-3">{children}</h3>,
                h4: ({ children }) => <h4 className="text-xs font-semibold text-zinc-300 mb-1 mt-2">{children}</h4>,
                ul: ({ children }) => <ul className="mb-2 ml-3 list-disc space-y-0.5 text-zinc-300">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-3 list-decimal space-y-0.5 text-zinc-300">{children}</ol>,
                li: ({ children }) => <li className="text-zinc-300 text-xs">{children}</li>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock
                    ? <code className={`block text-[11px] font-mono text-emerald-300 ${className}`}>{children}</code>
                    : <code className="rounded bg-zinc-800 px-1 py-0.5 text-[11px] font-mono text-fuchsia-300">{children}</code>;
                },
                pre: ({ children }) => (
                  <pre className="mb-3 overflow-x-auto rounded-lg border border-zinc-700/60 bg-zinc-800/80 p-3 text-[11px]">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a href={href} className="text-fuchsia-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="mb-2 border-l-2 border-zinc-600 pl-3 text-zinc-500 italic text-xs">{children}</blockquote>
                ),
                table: ({ children }) => (
                  <div className="mb-3 overflow-x-auto">
                    <table className="w-full border-collapse text-[11px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-zinc-800">{children}</thead>,
                th: ({ children }) => <th className="border border-zinc-700 px-2 py-1 text-left font-semibold text-zinc-200">{children}</th>,
                td: ({ children }) => <td className="border border-zinc-700/50 px-2 py-1 text-zinc-400">{children}</td>,
                tr: ({ children }) => <tr className="even:bg-zinc-800/30">{children}</tr>,
                hr: () => <hr className="my-3 border-zinc-700/50" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
