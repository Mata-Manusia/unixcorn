"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  chatStream, getAIConfig, listSessions, createSession,
  getSessionMessages, deleteSession, updateSessionTitle,
  checkSessionActive, streamSessionEvents, stopSession,
  type ChatMessage, type ChatSession,
} from "@/lib/api";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { Sidebar } from "./sidebar";
import { Setup } from "./setup";
import { ResourcesPanel } from "./resources-panel";
import { WorkspacePanel } from "./workspace-panel";
import { PlusIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, Cog6ToothIcon, BookOpenIcon, FolderOpenIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";

export interface ToolCallEvent { name: string; args: Record<string, any>; }
export interface ToolResultEvent { name: string; result: string; }

export interface ChatMessageDisplay {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  thinking?: string;
  thinkingStarted?: boolean;
  thinkingDone?: boolean;
  hint?: string;
  toolCalls?: ToolCallEvent[];
  toolResults?: ToolResultEvent[];
}

function lastAssistantIdx(msgs: ChatMessageDisplay[]): number {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "assistant") return i;
  }
  return -1;
}

export function Chat() {
  const router = useRouter();
  const params = useParams();
  const urlSessionId = params?.id ? parseInt(params.id as string) : null;

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState("");
  const [target, setTarget] = useState("");
  const [tokens, setTokens] = useState({ prompt: 0, completion: 0 });
  const [error, setError] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const isFirstMessage = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const streamingSessionRef = useRef<number | null>(null);

  useEffect(() => {
    // Optimistic: if previously configured, don't flash setup screen
    const wasConfigured = localStorage.getItem("unixcorn_ai_configured") === "1";
    if (wasConfigured) setConfigured(true);

    getAIConfig()
      .then((res) => {
        setConfigured(res.configured);
        if (res.configured) {
          localStorage.setItem("unixcorn_ai_configured", "1");
          if (res.config?.model) setModel(res.config.model);
        } else {
          localStorage.removeItem("unixcorn_ai_configured");
        }
      })
      .catch(() => {
        // Network error (daemon restarting) — only show setup if never configured
        if (!wasConfigured) setConfigured(false);
      });
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const s = await listSessions();
      setSessions(s);
      if (urlSessionId && s.find(x => x.id === urlSessionId)) {
        await loadSession(urlSessionId);
      } else if (s.length > 0) {
        await loadSession(s[0].id);
      }
    } catch {}
  };

  const loadSession = async (id: number, pushUrl = false) => {
    if (pushUrl) router.push(`/automation/s/${id}`);
    // Abort any existing stream before switching sessions
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    streamingSessionRef.current = null;
    setStreaming(false);

    try {
      const [msgs, active] = await Promise.all([
        getSessionMessages(id),
        checkSessionActive(id),
      ]);
      setCurrentSessionId(id);
      setError(null);
      setTokens({ prompt: 0, completion: 0 });
      isFirstMessage.current = msgs.filter(m => m.role === "user").length === 0;
      setMessages(msgs.map((m) => ({ id: `${m.role}-${m.id}`, role: m.role, content: m.content })));

      if (active) {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        streamingSessionRef.current = id;
        addAssistantMessage();
        setStreaming(true);

        streamSessionEvents(id, (ev) => {
          switch (ev.type) {
            case "token": appendToken(ev.content); break;
            case "thinking": appendThinking(ev.content); break;
            case "thinking_end": markThinkingDone(); break;
            case "hint": appendHint(ev.content); break;
            case "tool_start": addToolCall(ev.name, ev.args); break;
            case "tool_end": addToolResult(ev.name, ev.result); break;
            case "error": setError(ev.error); break;
            case "done":
              if (ev.prompt_tokens || ev.completion_tokens) {
                setTokens({ prompt: ev.prompt_tokens ?? 0, completion: ev.completion_tokens ?? 0 });
              }
              break;
          }
        }, ctrl.signal)
          .catch(() => {}) // AbortError already handled in api.ts; swallow any remaining
          .finally(() => {
            if (streamingSessionRef.current === id) {
              setStreaming(false);
              abortRef.current = null;
              streamingSessionRef.current = null;
            }
          });
      }
    } catch {}
  };

  // Manual trigger: click + → create session immediately
  const handleNewChat = async () => {
    // Abort existing stream so previous session doesn't keep streaming state
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    streamingSessionRef.current = null;
    setStreaming(false);

    try {
      const s = await createSession("Untitled Workspace");
      const now = new Date().toISOString();
      const newSession: ChatSession = { id: s.id, title: s.title, created_at: now, updated_at: now };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(s.id);
      setMessages([]);
      setError(null);
      setTokens({ prompt: 0, completion: 0 });
      isFirstMessage.current = true;
    } catch {}
  };

  const handleDeleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(id);
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) {
      setMessages([]);
      setCurrentSessionId(null);
      isFirstMessage.current = true;
      if (updated.length > 0) await loadSession(updated[0].id);
    }
  };

  const startEditTitle = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditingTitle(s.title);
  };

  const commitEditTitle = async () => {
    if (!editingSessionId || !editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    const title = editingTitle.trim();
    setSessions((prev) => prev.map((s) => s.id === editingSessionId ? { ...s, title } : s));
    await updateSessionTitle(editingSessionId, title).catch(() => {});
    setEditingSessionId(null);
  };

  const addAssistantMessage = useCallback(() => {
    const msg: ChatMessageDisplay = { id: `assistant-${Date.now()}`, role: "assistant", content: "", thinking: "", thinkingDone: false, toolCalls: [], toolResults: [] };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const appendToken = useCallback((token: string) => {
    setMessages((prev) => {
      const idx = lastAssistantIdx(prev);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], content: copy[idx].content + token };
      return copy;
    });
  }, []);

  const appendThinking = useCallback((token: string) => {
    setMessages((prev) => {
      const idx = lastAssistantIdx(prev);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], thinking: (copy[idx].thinking || "") + token, thinkingStarted: true };
      return copy;
    });
  }, []);

  const appendHint = useCallback((hint: string) => {
    setMessages((prev) => {
      const idx = lastAssistantIdx(prev);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], hint };
      return copy;
    });
  }, []);

  const markThinkingDone = useCallback(() => {
    setMessages((prev) => {
      const idx = lastAssistantIdx(prev);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], thinkingDone: true };
      return copy;
    });
  }, []);

  const addToolCall = useCallback((name: string, args: Record<string, any>) => {
    setMessages((prev) => {
      const idx = lastAssistantIdx(prev);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], toolCalls: [...(copy[idx].toolCalls || []), { name, args }] };
      return copy;
    });
  }, []);

  const addToolResult = useCallback((name: string, result: string) => {
    setMessages((prev) => {
      const idx = lastAssistantIdx(prev);
      const copy = [...prev];
      if (idx !== -1) {
        copy[idx] = { ...copy[idx], toolResults: [...(copy[idx].toolResults || []), { name, result }] };
      }
      return [
        ...copy,
        { id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role: "tool" as const, content: `Tool: ${name}\n${result.slice(0, 500)}${result.length > 500 ? "..." : ""}` },
      ];
    });
  }, []);

  const handleSend = async (input: string) => {
    if (!input.trim() || streaming) return;
    setError(null);

    let sid = currentSessionId;

    // Auto trigger: no session yet → create one
    if (!sid) {
      try {
        const s = await createSession(input.slice(0, 60));
        const now = new Date().toISOString();
        sid = s.id;
        setCurrentSessionId(sid);
        setSessions((prev) => [{ id: s.id, title: s.title, created_at: now, updated_at: now }, ...prev]);
        isFirstMessage.current = true;
      } catch {}
    }

    // Auto-update title on first message (manual trigger creates "Untitled Workspace")
    if (isFirstMessage.current && sid) {
      const autoTitle = input.slice(0, 60);
      setSessions((prev) => prev.map((s) => s.id === sid ? { ...s, title: autoTitle } : s));
      updateSessionTitle(sid, autoTitle).catch(() => {});
      isFirstMessage.current = false;
    }

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: input }]);

    const apiMessages: ChatMessage[] = [
      ...messages.filter((m) => m.role !== "tool").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: input },
    ];

    const sendingSid = sid;
    streamingSessionRef.current = sendingSid;
    setStreaming(true);
    abortRef.current = new AbortController();
    addAssistantMessage();

    try {
      await chatStream(apiMessages, model, (ev) => {
        switch (ev.type) {
          case "token": appendToken(ev.content); break;
          case "thinking": appendThinking(ev.content); break;
          case "thinking_end": markThinkingDone(); break;
          case "hint": appendHint(ev.content); break;
          case "tool_start": addToolCall(ev.name, ev.args); break;
          case "tool_end": addToolResult(ev.name, ev.result); break;
          case "error": setError(ev.error); break;
          case "done":
            if (ev.prompt_tokens || ev.completion_tokens) {
              setTokens({ prompt: ev.prompt_tokens ?? 0, completion: ev.completion_tokens ?? 0 });
            }
            break;
        }
      }, abortRef.current.signal, sid ?? undefined, target);
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message || "Request failed");
    } finally {
      if (streamingSessionRef.current === sendingSid) {
        setStreaming(false);
        abortRef.current = null;
        streamingSessionRef.current = null;
      }
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamingSessionRef.current = null;
    setStreaming(false);
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (configured === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-fuchsia-500" />
      </div>
    );
  }

  if (!configured || showSetup) {
    return (
      <div className="flex-1 bg-zinc-950">
        <Setup
          editMode={configured === true}
          onConfigured={() => { setConfigured(true); setShowSetup(false); }}
          onCancel={() => setShowSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-950">
      {/* Left sidebar */}
      <div className={`flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-200 ${sidebarOpen ? "w-64" : "w-0 overflow-hidden border-0"}`}>
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-600/20">
              <SparklesIcon className="h-4 w-4 text-fuchsia-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">Unixcorn AI</span>
          </div>
          <button
            onClick={handleNewChat}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="New chat"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {sessions.length === 0 && (
            <p className="px-2 py-3 text-[11px] text-zinc-600">No conversations yet</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`group flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                currentSessionId === s.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {editingSessionId === s.id ? (
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={commitEditTitle}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEditTitle(); if (e.key === "Escape") setEditingSessionId(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 rounded bg-zinc-700 px-1.5 py-0.5 text-[13px] text-zinc-100 focus:outline-none"
                />
              ) : (
                <span
                  className="flex-1 truncate text-[13px]"
                  onDoubleClick={(e) => startEditTitle(s, e)}
                  title="Double-click to rename"
                >
                  {s.title}
                </span>
              )}
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="hidden shrink-0 rounded p-0.5 text-zinc-600 hover:text-red-400 group-hover:block"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 px-2 py-2">
          <button
            onClick={() => setShowSetup(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            Edit AI Config
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-2.5">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            {sidebarOpen ? <ChevronLeftIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>

          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="model-id"
            className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1 text-xs font-mono text-zinc-300 focus:border-zinc-600 focus:outline-none w-44"
          />

          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1">
            <span className="text-[10px] text-zinc-600 font-mono shrink-0">TARGET</span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://example.com"
              className="bg-transparent text-xs font-mono text-fuchsia-300 placeholder:text-zinc-600 focus:outline-none w-48"
            />
          </div>

          {streaming && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Generating...
            </span>
          )}

          {!streaming && (tokens.prompt > 0 || tokens.completion > 0) && (
            <span className="text-[10px] font-mono text-zinc-600" title={`Prompt: ${tokens.prompt.toLocaleString()} | Completion: ${tokens.completion.toLocaleString()}`}>
              ↑{(tokens.prompt / 1000).toFixed(1)}k ↓{(tokens.completion / 1000).toFixed(1)}k tokens
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => { setResourcesOpen((v) => !v); setActivityOpen(false); setWorkspaceOpen(false); }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                resourcesOpen
                  ? "bg-fuchsia-600/20 text-fuchsia-300"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
              title="Resources"
            >
              <BookOpenIcon className="h-3.5 w-3.5" />
              Resources
            </button>
            <button
              onClick={() => { setWorkspaceOpen((v) => !v); setActivityOpen(false); setResourcesOpen(false); }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                workspaceOpen
                  ? "bg-emerald-600/20 text-emerald-300"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
              title="Workspace Files"
            >
              <FolderOpenIcon className="h-3.5 w-3.5" />
              Files
            </button>
            <button
              onClick={() => { setActivityOpen((v) => !v); setResourcesOpen(false); setWorkspaceOpen(false); }}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                activityOpen
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col min-w-0">
            <MessageList
              messages={messages}
              error={error}
              bottomRef={bottomRef}
              onPromptClick={handleSend}
              streaming={streaming}
            />
            <ChatInput onSend={handleSend} onStop={handleStop} streaming={streaming} target={target} />
          </div>
          {activityOpen && <Sidebar messages={messages} />}
          {resourcesOpen && <ResourcesPanel onClose={() => setResourcesOpen(false)} />}
          {workspaceOpen && (
            <WorkspacePanel
              sessionId={currentSessionId}
              streaming={streaming}
              onClose={() => setWorkspaceOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
