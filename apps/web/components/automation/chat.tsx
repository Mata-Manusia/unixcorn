"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { chatStream, getAIConfig, type ChatMessage } from "@/lib/api";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { Sidebar } from "./sidebar";
import { Setup } from "./setup";

const models = [
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini Flash" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
];

interface ToolCallEvent {
  name: string;
  args: Record<string, any>;
}

interface ToolResultEvent {
  name: string;
  result: string;
}

export interface ChatMessageDisplay {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCallEvent[];
  toolResults?: ToolResultEvent[];
}

export function Chat() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(models[0].id);
  const [availableModels, setAvailableModels] = useState(models);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getAIConfig()
      .then((res) => {
        setConfigured(res.configured);
        if (res.configured && res.config?.model) {
          const configuredModel = res.config.model;
          setModel(configuredModel);
          const exists = models.some((m) => m.id === configuredModel);
          if (!exists) {
            setAvailableModels([...models, { id: configuredModel, label: configuredModel }]);
          }
        }
      })
      .catch(() => setConfigured(false));
  }, []);

  // Current assistant message being built
  const currentAssistantRef = useRef<ChatMessageDisplay | null>(null);

  const addAssistantMessage = useCallback(() => {
    const msg: ChatMessageDisplay = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      toolCalls: [],
      toolResults: [],
    };
    currentAssistantRef.current = msg;
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const appendToken = useCallback((token: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: last.content + token };
      }
      return copy;
    });
  }, []);

  const addToolCall = useCallback((name: string, args: Record<string, any>) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === "assistant") {
        const tc = [...(last.toolCalls || []), { name, args }];
        copy[copy.length - 1] = { ...last, toolCalls: tc };
      }
      return copy;
    });
  }, []);

  const addToolResult = useCallback((name: string, result: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === "assistant") {
        const tr = [...(last.toolResults || []), { name, result }];
        copy[copy.length - 1] = { ...last, toolResults: tr };
      }
      return copy;
    });
    // Also add as a tool message in the conversation
    setMessages((prev) => [
      ...prev,
      {
        id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "tool",
        content: `Tool: ${name}\n${result.slice(0, 500)}${result.length > 500 ? "..." : ""}`,
      },
    ]);
  }, []);

  const handleSend = async (input: string) => {
    if (!input.trim() || streaming) return;
    setError(null);

    const userMsg: ChatMessageDisplay = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Build API messages
    const apiMessages: ChatMessage[] = [
      ...messages
        .filter((m) => m.role !== "tool") // tool results shown inline
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user" as const, content: input },
    ];

    setStreaming(true);
    abortRef.current = new AbortController();

    addAssistantMessage();

    try {
      await chatStream(apiMessages, model, (ev) => {
        switch (ev.type) {
          case "token":
            appendToken(ev.content);
            break;
          case "tool_start":
            addToolCall(ev.name, ev.args);
            break;
          case "tool_end":
            addToolResult(ev.name, ev.result);
            break;
          case "error":
            setError(ev.error);
            break;
          case "meta":
            break;
        }
      }, abortRef.current.signal);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Request failed");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  // Scroll to bottom on new messages
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [showSetup, setShowSetup] = useState(false);

  if (configured === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-fuchsia-500" />
      </div>
    );
  }

  if (!configured || showSetup) {
    return (
      <div className="flex-1">
        <Setup
          editMode={configured === true}
          onConfigured={() => { setConfigured(true); setShowSetup(false); }}
          onCancel={() => setShowSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Model bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-mono text-zinc-300 focus:border-fuchsia-600"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            {streaming && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Streaming
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetup(true)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              Edit Config
            </button>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              {sidebarOpen ? "Hide Panel" : "Show Panel"}
            </button>
            <button
              onClick={handleClear}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <MessageList messages={messages} error={error} bottomRef={bottomRef} />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          streaming={streaming}
        />
      </div>

      {/* Sidebar */}
      {sidebarOpen && <Sidebar messages={messages} />}
    </div>
  );
}
