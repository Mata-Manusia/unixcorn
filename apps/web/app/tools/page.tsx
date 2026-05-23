"use client";

import { useState } from "react";
import { MethodologyTool } from "@/components/tools/methodology";

function Base64Tool() {
  const [input, setInput]   = useState("");
  const [output, setOutput] = useState("");
  return (
    <div className="space-y-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Input..."
        className="w-full rounded border border-zinc-700 bg-zinc-800 p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600 h-24 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setOutput(btoa(input))}
          className="rounded bg-fuchsia-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-fuchsia-600 transition-colors"
        >
          Encode
        </button>
        <button
          onClick={() => { try { setOutput(atob(input)); } catch { setOutput("Invalid base64"); } }}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors"
        >
          Decode
        </button>
      </div>
      {output && (
        <div className="rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 break-all">
          {output}
        </div>
      )}
    </div>
  );
}

function HashTool() {
  const [input, setInput]   = useState("");
  const [hashes, setHashes] = useState<Record<string, string>>({});

  const compute = async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const results: Record<string, string> = {};
    for (const algo of ["SHA-1", "SHA-256", "SHA-512"]) {
      const buf = await crypto.subtle.digest(algo, data);
      results[algo] = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    setHashes(results);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Text to hash..."
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600"
      />
      <button
        onClick={compute}
        className="rounded bg-fuchsia-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-fuchsia-600 transition-colors"
      >
        Compute Hashes
      </button>
      {Object.entries(hashes).map(([algo, hash]) => (
        <div key={algo}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{algo}</p>
          <div className="rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 break-all">{hash}</div>
        </div>
      ))}
    </div>
  );
}

function JWTTool() {
  const [token, setToken]   = useState("");
  const [decoded, setDecoded] = useState<{ header: unknown; payload: unknown } | null>(null);
  const [error, setError]   = useState("");

  const decode = () => {
    try {
      const [h, p] = token.split(".");
      const header  = JSON.parse(atob(h.replace(/-/g, "+").replace(/_/g, "/")));
      const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
      setDecoded({ header, payload });
      setError("");
    } catch {
      setError("Invalid JWT");
      setDecoded(null);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste JWT token..."
        className="w-full rounded border border-zinc-700 bg-zinc-800 p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600 h-24 resize-none"
      />
      <button
        onClick={decode}
        className="rounded bg-fuchsia-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-fuchsia-600 transition-colors"
      >
        Decode
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {decoded && (
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Header</p>
            <pre className="rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 overflow-auto">
              {JSON.stringify(decoded.header, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Payload</p>
            <pre className="rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 overflow-auto">
              {JSON.stringify(decoded.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

const TOOLS = [
  { id: "base64",      label: "Base64",             component: <Base64Tool /> },
  { id: "hash",        label: "Hash",               component: <HashTool /> },
  { id: "jwt",         label: "JWT Decoder",        component: <JWTTool /> },
  { id: "methodology", label: "Exploit Methodology", component: <MethodologyTool /> },
];

export default function ToolsPage() {
  const [active, setActive] = useState("base64");
  const current = TOOLS.find((t) => t.id === active);

  return (
    <div className="bg-zinc-950 min-h-[calc(100vh-56px)] text-zinc-100 flex flex-col">
      <div className="flex flex-1" style={{ height: "calc(100vh - 56px)" }}>

        {/* Sidebar */}
        <aside className="w-48 shrink-0 border-r border-zinc-800 bg-zinc-900 overflow-y-auto">
          <div className="p-3 border-b border-zinc-800">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Utilities</p>
          </div>
          <div className="p-2">
            {TOOLS.filter((t) => t.id !== "methodology").map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActive(tool.id)}
                className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors mb-0.5 border-l-2 ${
                  active === tool.id
                    ? "border-l-fuchsia-500 bg-zinc-800 text-zinc-100"
                    : "border-l-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-b border-zinc-800">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Reference</p>
          </div>
          <div className="p-2">
            <button
              onClick={() => setActive("methodology")}
              className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors border-l-2 ${
                active === "methodology"
                  ? "border-l-fuchsia-500 bg-zinc-800 text-zinc-100"
                  : "border-l-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              Exploit Methodology
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 border-b border-zinc-800 pb-2.5">
            <p className="text-xs font-semibold text-zinc-300">{current?.label}</p>
          </div>
          {current?.component}
        </div>
      </div>
    </div>
  );
}
