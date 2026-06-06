"use client";

import { useState, useEffect } from "react";
import { getAIConfig, saveAIConfig as saveConfig, type AIConfig } from "@/lib/api";
import { BeakerIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  onConfigured: () => void;
  editMode?: boolean;
  onCancel?: () => void;
}

export function Setup({ onConfigured, editMode, onCancel }: Props) {
  const [baseURL, setBaseURL] = useState("https://opencode.ai/zen/v1");
  const [model, setModel] = useState("big-pickle");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getAIConfig()
      .then((res) => {
        if (res.configured && res.config) {
          setBaseURL(res.config.base_url);
          setModel(res.config.model);
          if (!editMode) {
            onConfigured();
          }
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [onConfigured, editMode]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveConfig({ base_url: baseURL, model, api_key: apiKey });
      localStorage.setItem("unixcorn_ai_configured", "1");
      setSuccess(true);
      setTimeout(() => onConfigured(), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-fuchsia-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <BeakerIcon className="mx-auto h-10 w-10 text-fuchsia-400" />
          <h1 className="mt-3 text-lg font-bold text-zinc-100">
            {editMode ? "Edit AI Credentials" : "AI Provider Setup"}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {editMode
              ? "Update your AI provider configuration."
              : "Configure your AI provider to use the Automation agent."}
            <br />Supports any OpenAI-compatible API (Alibaba Cloud, OpenRouter, OpenAI, local LLM).
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Base URL
            </label>
            <input
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://opencode.ai/zen/v1"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-200 focus:border-fuchsia-600 focus:outline-none"
            />
            <p className="mt-0.5 text-[10px] text-zinc-600">
              API endpoint (e.g., OpenRouter, OpenAI, vLLM, Ollama)
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Model
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="big-pickle"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-200 focus:border-fuchsia-600 focus:outline-none"
            />
            <p className="mt-0.5 text-[10px] text-zinc-600">
              Model name/ID from your provider
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={editMode ? "Leave empty to keep current key" : "sk-..."}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-200 focus:border-fuchsia-600 focus:outline-none"
            />
            <p className="mt-0.5 text-[10px] text-zinc-600">
              {editMode ? "Leave empty to keep your existing API key" : "Stored securely in your local database"}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">
              <XCircleIcon className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-xs text-emerald-400">
              <CheckCircleIcon className="h-4 w-4 shrink-0" />
              Configuration saved successfully
            </div>
          )}

          <div className="flex gap-2">
            {editMode && onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`rounded bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${editMode && onCancel ? "flex-1" : "w-full"}`}
            >
              {saving ? "Saving..." : editMode ? "Update Configuration" : "Save Configuration"}
            </button>
          </div>
        </div>

        {/* Quick presets */}
        {!editMode && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Presets
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "OpenCode Zen", base: "https://opencode.ai/zen/v1", model: "big-pickle" },
              { label: "OpenRouter", base: "https://openrouter.ai/api/v1", model: "openai/gpt-4o" },
              { label: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-4o" },
              { label: "DeepSeek", base: "https://api.deepseek.com/v1", model: "deepseek-chat" },
              { label: "Ollama (local)", base: "http://localhost:11434/v1", model: "llama3.2" },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => { setBaseURL(p.base); setModel(p.model); }}
                className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
              >
                <p className="font-semibold text-zinc-300">{p.label}</p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-600">{p.model}</p>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
