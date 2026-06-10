"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpIcon, StopIcon } from "@heroicons/react/24/solid";

interface Props {
  onSend: (input: string) => void;
  onStop: () => void;
  streaming: boolean;
  target?: string;
}

const ATTACK_PRESETS = [
  {
    label: "🔍 Full Recon",
    prompt: (t: string) =>
      `Lakukan full reconnaissance pada ${t || "$TARGET"}. Mulai dari port scan (nmap top-1000), service enum, technology detection (whatweb/curl headers), directory fuzzing (ffuf), dan cek common vulns. Save semua output ke $WORKSPACE/. Berikan summary temuan di akhir.`,
  },
  {
    label: "⚡ Port Scan",
    prompt: (t: string) =>
      `Scan port ${t || "$TARGET"} dengan nmap. Cek top-1000 TCP ports, detect service versions, OS fingerprint. Save hasil ke $WORKSPACE/nmap.txt. Analisa port yang menarik untuk attack surface.`,
  },
  {
    label: "📁 Dir Fuzz",
    prompt: (t: string) =>
      `Fuzz directory dan file di ${t || "$TARGET"} menggunakan ffuf dengan wordlist common. Cari hidden endpoints, backup files (.bak, .old), admin panels, dan config files. Save hasil ke $WORKSPACE/dirs.txt. Filter false positives.`,
  },
  {
    label: "💉 SQLi Test",
    prompt: (t: string) =>
      `Test SQL injection di ${t || "$TARGET"}. Identify semua parameter input (GET, POST, headers). Test manual error-based dan boolean-based payloads. Jika ada indikasi SQLi, jalankan sqlmap --batch. Save output ke $WORKSPACE/sqli/. Report setiap finding dengan evidence.`,
  },
  {
    label: "🔥 XSS Scan",
    prompt: (t: string) =>
      `Test Cross-Site Scripting (XSS) di ${t || "$TARGET"}. Identify semua input fields dan reflection points. Test reflected XSS, stored XSS, dan DOM-based. Coba filter bypass jika ada WAF. Report payload yang berhasil.`,
  },
  {
    label: "🔑 Auth Test",
    prompt: (t: string) =>
      `Test authentication di ${t || "$TARGET"}. Cari login forms dan auth endpoints. Test: default credentials, SQL injection di login form, brute force protection, session fixation, dan JWT issues jika ada. Report setiap weakness.`,
  },
  {
    label: "🕷️ Tech Stack",
    prompt: (t: string) =>
      `Identify technology stack ${t || "$TARGET"}: web server, framework, CMS, library versions, JavaScript frameworks. Cari CVE yang relevan untuk versi yang terdeteksi. Gunakan whatweb, curl headers, Wappalyzer patterns, dan web_search untuk CVE lookup.`,
  },
  {
    label: "📡 Subdomains",
    prompt: (t: string) =>
      `Enumerate subdomains untuk ${t || "$TARGET"} menggunakan subfinder. Probe yang aktif dengan httpx. Identify subdomain yang menarik (dev, staging, admin, api). Save ke $WORKSPACE/subdomains.txt. Cek potential takeover.`,
  },
];

export function ChatInput({ onSend, onStop, streaming, target }: Props) {
  const [input, setInput] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!streaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [streaming]);

  const handleSubmit = () => {
    if (streaming) {
      onStop();
    } else if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [input]);

  const applyPreset = (preset: (typeof ATTACK_PRESETS)[number]) => {
    setInput(preset.prompt(target || ""));
    setShowPresets(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const canSend = input.trim().length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl space-y-2">
        {/* Quick attack presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowPresets((v) => !v)}
            disabled={streaming}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 ${
              showPresets
                ? "border-fuchsia-600/60 bg-fuchsia-600/20 text-fuchsia-300"
                : "border-zinc-700 bg-zinc-800/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            ⚡ Attack Presets
          </button>

          {showPresets &&
            ATTACK_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                disabled={streaming}
                className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-[10px] text-zinc-400 transition-colors hover:border-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-200 disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
        </div>

        {/* Input box */}
        <div className="relative flex items-end rounded-2xl border border-zinc-700 bg-zinc-800 shadow-lg focus-within:border-zinc-600">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            rows={1}
            disabled={streaming}
            className="max-h-[200px] min-h-[52px] flex-1 resize-none bg-transparent px-4 py-3.5 pr-14 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-60"
          />
          <div className="absolute bottom-2.5 right-2.5">
            <button
              onClick={handleSubmit}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                streaming
                  ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  : canSend
                  ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
              }`}
              disabled={!streaming && !canSend}
            >
              {streaming ? (
                <StopIcon className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpIcon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-zinc-600">
          Responses are generated by AI. Verify critical findings manually.
        </p>
      </div>
    </div>
  );
}
