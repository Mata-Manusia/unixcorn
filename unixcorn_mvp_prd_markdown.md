# Unixcorn — MVP & PRD

## Product Overview

### Product Name
**Unixcorn**

### Product Type
Local-first browser-based offensive security workspace.

### Positioning
Unixcorn adalah:

> Modular local security operating environment untuk web security assessment & automation.

Bukan sekadar:
- exploit launcher
- script collection
- hacking panel

---

# Product Goals

## Primary Goals

### 1. Menjadi lightweight local offensive workspace
- browser-based
- low resource usage
- modular
- realtime

### 2. Menyatukan workflow security assessment
Daripada user:
- buka terminal banyak
- manual chaining tools
- simpan output manual

Unixcorn menjadi:

```text
single unified workspace
```

### 3. Menjadi extensible plugin ecosystem
Future:
- plugin marketplace
- community modules
- custom workflow

---

# Target User

## Primary
- Bug bounty hunter
- Pentester
- Security researcher
- Web security learner

## Secondary
- SOC analyst
- Security engineer
- Red team operator

---

# MVP Scope

Fokus MVP:

> Recon orchestration + realtime workspace

JANGAN langsung build:
- exploit automation besar
- AI agent
- collaborative cloud
- VPN custom protocol

Karena:
itu cepat jadi overengineering.

---

# MVP Features

# 1. Recon Module (Core MVP)

## Features
- target input
- subdomain enumeration
- HTTP probing
- port scanning
- tech detection
- screenshot collection
- nuclei scanning
- result visualization

## Integrated Tools

| Feature | Tool |
|---|---|
| Subdomain | subfinder |
| DNS | amass |
| HTTP probe | httpx |
| Port scan | naabu |
| Screenshot | gowitness |
| Vulnerability scan | nuclei |

## Flow

```text
Target Input
   ↓
Recon Pipeline
   ↓
Tool Execution
   ↓
Realtime Logs
   ↓
Result Parsing
   ↓
Visualization
```

---

# 2. Logs Module

## Features
- command logs
- execution history
- realtime output
- error logs
- scan duration
- export results

---

# 3. Workspace Dashboard

## Features
- active jobs
- recent scans
- system usage
- websocket status
- task progress

---

# 4. Tools Module

## Features
Mini utility tools:
- hash encoder/decoder
- JWT decoder
- base64 utility
- DNS lookup
- header analyzer
- regex tester

---

# 5. Plugin Runtime (Minimal)

## Features
- register plugin
- execute plugin
- plugin metadata
- plugin permissions

---

# Non-MVP Features (Later)

Jangan build dulu:
- exploit marketplace
- AI automation
- collaborative team mode
- cloud sync
- custom VPN protocol
- distributed worker
- remote agents

---

# Tech Stack

## Frontend

| Layer | Tech |
|---|---|
| Framework | Next.js |
| Styling | Tailwind |
| UI | shadcn/ui |
| State | Zustand |
| Terminal | xterm.js |
| Table | TanStack Table |

---

## Backend

| Layer | Tech |
|---|---|
| Core Daemon | Go |
| API | Gin/Fiber |
| WebSocket | Gorilla WebSocket |
| Queue | Native goroutine worker |
| DB | SQLite |

---

## Runtime

| Layer | Tech |
|---|---|
| Plugin Runtime | subprocess |
| Sandbox | optional Docker |
| Execution | native CLI |

---

# System Architecture

## High Level Flow

```text
Browser UI
     ↓
Go Local Daemon
     ↓
Worker Queue
     ↓
Plugin Runtime
     ↓
Security Tools
```

---

# Directory Structure

```text
unixcorn/
├── apps/
│   ├── web/
│   └── daemon/
│
├── plugins/
│   ├── recon/
│   ├── tools/
│   └── exploit/
│
├── internal/
│
├── storage/
│
├── scripts/
│
└── package.json
```

---

# Local Development Flow

## Single Command Development

```bash
npm run dev
```

Runs:
- frontend
- backend daemon
- websocket
- plugin watcher

## Development Flow

```text
npm run dev
      ↓
Node Orchestrator
      ↓
Next.js Frontend
Go Daemon
Plugin Runtime
```

---

# Database Design (MVP)

## scans

```sql
id
target
status
created_at
finished_at
```

## scan_results

```sql
id
scan_id
tool
type
result
raw_output
```

## logs

```sql
id
scan_id
level
message
timestamp
```

---

# API Design

## Recon

```http
POST /api/recon/start
GET /api/recon/:id
GET /api/recon/:id/results
```

## Logs

```http
GET /api/logs
```

## Plugins

```http
GET /api/plugins
POST /api/plugins/run
```

---

# WebSocket Events

```text
scan.started
scan.progress
scan.log
scan.completed
plugin.output
```

---

# Security Model

## Important

Unixcorn harus:
- local-only by default
- no public binding
- sandbox optional
- permission-based plugin system

## Plugin Permission Example

```json
{
  "name": "nuclei",
  "permissions": [
    "network",
    "filesystem:read"
  ]
}
```

---

# MVP UI Pages

## 1. Dashboard
- recent scans
- active jobs
- quick actions

## 2. Recon Workspace
- target input
- scan config
- realtime logs
- result tabs

## 3. Logs Viewer
- command history
- error logs
- raw output

## 4. Tools Workspace
- utility mini tools

---

# MVP Success Metrics

## Technical
- startup < 3 sec
- idle RAM < 300MB
- websocket stable
- multi scan stable

## UX
- one-command setup
- realtime logs smooth
- clean workflow
- low friction usage

---

# Roadmap

## Phase 1 — MVP
- recon orchestration
- logs
- websocket
- dashboard
- SQLite

## Phase 2
- plugin SDK
- workflow builder
- better visualization

## Phase 3
- exploit verification framework
- sandbox runtime
- report generation

## Phase 4
- AI-assisted analysis
- distributed workers
- collaboration

---

# Final Positioning

Unixcorn bukan:

```text
"website hacking panel"
```

Tetapi:

```text
"Local-first offensive security operating environment."
```

Dan itu positioning yang jauh lebih:
- scalable
- professional
- maintainable
- future-proof.

