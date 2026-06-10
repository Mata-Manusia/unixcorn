"use client";

import { useState, useEffect, useCallback } from "react";
import { listWorkspaceFiles, getWorkspaceFile, type WorkspaceFile } from "@/lib/api";
import { FolderOpenIcon, DocumentTextIcon, ArrowPathIcon, XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface Props {
  sessionId: number | null;
  streaming?: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return d.toLocaleTimeString();
  } catch {
    return iso;
  }
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["txt", "log", "out"].includes(ext)) return "📄";
  if (["json", "xml", "yaml", "yml"].includes(ext)) return "📋";
  if (["py", "sh", "rb", "go", "js", "ts"].includes(ext)) return "📝";
  if (["html", "htm"].includes(ext)) return "🌐";
  if (["csv"].includes(ext)) return "📊";
  return "📁";
}

export function WorkspacePanel({ sessionId, streaming, onClose }: Props) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [workspace, setWorkspace] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await listWorkspaceFiles(sessionId);
      setFiles(data.files || []);
      setWorkspace(data.workspace || "");
    } catch {}
    setLoading(false);
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-poll while agent is streaming
  useEffect(() => {
    if (!streaming) return;
    const iv = setInterval(refresh, 4000);
    return () => clearInterval(iv);
  }, [streaming, refresh]);

  const openFile = async (name: string) => {
    if (!sessionId) return;
    setSelected(name);
    setFileContent(null);
    setFileLoading(true);
    try {
      const data = await getWorkspaceFile(sessionId, name);
      setFileContent(data.content);
    } catch {
      setFileContent("error: could not read file");
    }
    setFileLoading(false);
  };

  const downloadFile = (name: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
        <FolderOpenIcon className="h-4 w-4 text-fuchsia-400 shrink-0" />
        <span className="flex-1 text-xs font-semibold text-zinc-200">Workspace</span>
        <button
          onClick={refresh}
          className={`rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors ${loading ? "animate-spin" : ""}`}
          title="Refresh"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Workspace path */}
      {workspace && (
        <div className="border-b border-zinc-800/60 px-3 py-1.5">
          <p className="font-mono text-[10px] text-zinc-600 truncate" title={workspace}>{workspace}</p>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-zinc-700">
            <FolderOpenIcon className="h-8 w-8" />
            <p className="text-xs">No files yet</p>
            <p className="text-[10px] text-zinc-800">Agent will save outputs here</p>
          </div>
        ) : (
          <div className="py-1">
            {files.map((f) => (
              <button
                key={f.name}
                onClick={() => !f.is_dir && openFile(f.name)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  selected === f.name
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                } ${f.is_dir ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="text-sm shrink-0">{f.is_dir ? "📁" : getFileIcon(f.name)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[12px]">{f.name}</span>
                  <span className="block text-[10px] text-zinc-600">
                    {formatBytes(f.size)} · {formatTime(f.mod_time)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File preview */}
      {selected && (
        <div className="flex max-h-72 flex-col border-t border-zinc-800">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60">
            <DocumentTextIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span className="flex-1 truncate text-[11px] text-zinc-400">{selected}</span>
            {fileContent && (
              <button
                onClick={() => downloadFile(selected, fileContent)}
                className="rounded p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => { setSelected(null); setFileContent(null); }}
              className="rounded p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {fileLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-fuchsia-500" />
              </div>
            ) : (
              <pre className="p-3 text-[10px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                {fileContent}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
