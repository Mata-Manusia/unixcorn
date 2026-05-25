# 🦄 Unixcorn

<img width="1680" height="1050" alt="SCR-20260525-mkxq" src="https://github.com/user-attachments/assets/9216dab2-f7ed-4f8c-b0ab-ccf42e995de1" />
<img width="1680" height="1050" alt="SCR-20260525-mkfd" src="https://github.com/user-attachments/assets/57529bff-f943-4e66-9bc7-a4fc8a8f59cb" />


[![Go Version](https://img.shields.io/github/go-mod/go-version/akufikri/unixcorn?label=Go)](https://golang.org)
[![Next.js Version](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Local--first-orange)](#)

> **Unixcorn** is a modular, local-first, browser-based offensive security workspace. It acts as a local security operating environment designed for web security assessments, reconnaissance orchestration, and workflow automation.

Unlike simple exploit launchers or static script collections, **Unixcorn** provides a single unified workspace to orchestrate multi-tool pipelines, capture real-time execution logs, visualize security data, and manage custom plugins.

---

## 🚀 Key Features

*   **Recon Orchestration (Core MVP):** Orchestrates sub-domain enumeration, DNS queries, port scans, HTTP probing, tech detection, screenshot collection, and vulnerability scanning in a single pipeline.
*   **Integrated Industry Tools:** Native integration with tools like `subfinder`, `amass`, `httpx`, `naabu`, `gowitness`, and `nuclei`.
*   **Real-time Logs & Execution History:** Live logs terminal output powered by `xterm.js`, with execution tracking and exportable reports.
*   **Extensible Plugin System:** Lightweight execution runtime supporting Python/Go/Bash scripts with fine-grained manifest permissions.
*   **Local-first Architecture:** Runs entirely on localhost. No public ports binding, no cloud sync overhead, and optional Docker sandboxing for plugins.

---

## 🏗️ System Architecture

```text
       ┌────────────────────────┐
       │   Browser-based UI     │ (Next.js, Zustand, Shadcn/ui)
       └───────────┬────────────┘
                   │ WebSocket (Real-time Events / Logs)
                   ▼
       ┌────────────────────────┐
       │    Go Local Daemon     │ (SQLite, Gin/Fiber, Native worker queue)
       └───────────┬────────────┘
                   │ Subprocess execution
                   ▼
       ┌────────────────────────┐
       │     Plugin Runtime     │ (Executes Python, Go, Bash plugins)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │   Security CLI Tools   │ (subfinder, nuclei, httpx, etc.)
       └────────────────────────┘
```

---

## 📂 Project Structure

```text
unixcorn/
├── apps/
│   ├── web/           # Next.js Frontend (Tailwind, Zustand, xterm.js)
│   └── daemon/        # Go Daemon Backend (REST API, WebSockets, DB controller)
├── plugins/
│   ├── recon/         # Subdomain, port-scanning, and discovery plugins
│   ├── tools/         # Text encoders, JWT decoders, header analyzers
│   └── exploit/       # Exploit verification modules
├── internal/          # Shared Go packages
├── storage/           # SQLite databases, scan logs, and dynamic assets
├── scripts/           # dev.js development orchestrator
└── package.json       # Workspace definition & scripts
```

---

## 🛠️ Getting Started

### Prerequisites

Make sure you have the following tools installed locally:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Go](https://go.dev/) (v1.20+)
*   Security tools in your path (optional, installed as needed): `subfinder`, `amass`, `httpx`, `naabu`, `gowitness`, `nuclei`.

### Installation

1.  Clone this repository:
    ```bash
    git clone https://github.com/akufikri/unixcorn.git
    cd unixcorn
    ```

2.  Install Node.js dependencies for the workspace:
    ```bash
    npm install
    ```

### Local Development

Run the orchestrator command to launch the frontend, daemon, and plugin watcher concurrently:
```bash
npm run dev
```

*   **Frontend:** [http://localhost:3000](http://localhost:3000)
*   **Go Daemon API:** [http://localhost:8080](http://localhost:8080)

---

## 🔒 Security Model

Unixcorn is built with a security-first, local-only posture:
1.  **Local Binding:** The Go daemon binds strictly to `127.0.0.1` to prevent unauthorized external access.
2.  **No Cloud Dependency:** Databases (SQLite) and logs are kept entirely local under the `storage/` directory.
3.  **Permission-based Plugins:** Plugins declare permissions (e.g., `network`, `filesystem:read`) in their JSON manifest.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
