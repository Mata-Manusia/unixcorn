package plugin

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os/exec"
	"strings"
	"sync"
)

// PipelineRequest carries everything a recon run needs.
type PipelineRequest struct {
	ScanID     string
	Target     string
	Tools      []string
	NucleiTags []string
	Severity   []string
	UpdateTpl  bool
}

// PipelineEvent — structured emit per tool finding.
type PipelineEvent struct {
	Tool       string
	Type       string // subdomain | host | port | vuln | log | error
	Result     string // canonical value (subdomain, URL, IP:PORT, "CVE-... severity")
	RawOutput  string // original tool line
	Severity   string // for vuln events
	CVE        string // for vuln events
	TemplateID string // nuclei template-id
	Host       string // host the finding belongs to
}

type ReconPipeline struct {
	OnEvent func(PipelineEvent)
	OnLog   func(level, line string) // mirror to logs table
}

func NewReconPipeline(onEvent func(PipelineEvent), onLog func(level, line string)) *ReconPipeline {
	return &ReconPipeline{OnEvent: onEvent, OnLog: onLog}
}

func (p *ReconPipeline) emit(ev PipelineEvent) {
	if p.OnEvent != nil {
		p.OnEvent(ev)
	}
}

func (p *ReconPipeline) log(level, line string) {
	if p.OnLog != nil {
		p.OnLog(level, line)
	}
}

// toolMeta — for each tool: which binary candidates to try + which banner to look for
// in `<tool> -version` output (to avoid collisions with non-ProjectDiscovery namesakes).
type toolMeta struct {
	candidates []string
	versionArg string
	bannerHint string // substring expected in -version output
	installCmd string
}

var toolRegistry = map[string]toolMeta{
	"subfinder": {
		candidates: []string{"subfinder"},
		versionArg: "-version",
		bannerHint: "projectdiscovery",
		installCmd: "brew install subfinder  OR  go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
	},
	"httpx": {
		// macOS `httpx` from python httpie collides with ProjectDiscovery `httpx`.
		candidates: []string{"httpx-toolkit", "httpx-pd", "httpx"},
		versionArg: "-version",
		bannerHint: "projectdiscovery",
		installCmd: "brew install httpx  OR  go install github.com/projectdiscovery/httpx/cmd/httpx@latest  (if `httpx` resolves to Python httpie, install ProjectDiscovery's binary as `httpx-toolkit`)",
	},
	"naabu": {
		candidates: []string{"naabu"},
		versionArg: "-version",
		bannerHint: "projectdiscovery",
		installCmd: "brew install naabu  OR  go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest",
	},
	"nuclei": {
		candidates: []string{"nuclei"},
		versionArg: "-version",
		bannerHint: "projectdiscovery",
		installCmd: "brew install nuclei  OR  go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
	},
}

// resolveTool returns the binary name that should actually be invoked, or "" if no
// suitable binary is on PATH. Logs explanatory messages via p.log.
func (p *ReconPipeline) resolveTool(name string) string {
	meta, ok := toolRegistry[name]
	if !ok {
		return name // fall-through for tools we don't gate
	}
	for _, cand := range meta.candidates {
		path, err := exec.LookPath(cand)
		if err != nil {
			continue
		}
		// Verify it's the right tool by checking -version banner
		out, _ := exec.Command(cand, meta.versionArg).CombinedOutput()
		bannerOK := strings.Contains(strings.ToLower(string(out)), meta.bannerHint)
		if bannerOK {
			if cand != name {
				p.log("info", fmt.Sprintf("%s resolved to %q (avoiding non-PD %q on PATH)", name, cand, name))
			}
			return cand
		}
		p.log("warn", fmt.Sprintf("%s found at %s but version banner missing %q — not ProjectDiscovery's %s, skipping",
			name, path, meta.bannerHint, name))
	}
	p.log("error", fmt.Sprintf(
		"%s not installed (or wrong binary on PATH). Install:\n  %s",
		name, meta.installCmd,
	))
	return ""
}

// stripScheme returns host:port portion suitable for naabu / DNS tools.
func stripScheme(u string) string {
	if !strings.Contains(u, "://") {
		return u
	}
	parsed, err := url.Parse(u)
	if err != nil {
		return u
	}
	return parsed.Host
}

// Run executes the full pipeline. Returns when all selected stages finish (or ctx cancels).
func (p *ReconPipeline) Run(ctx context.Context, req PipelineRequest) {
	picked := map[string]bool{}
	for _, t := range req.Tools {
		picked[strings.ToLower(t)] = true
	}

	target := strings.TrimSpace(req.Target)
	if target == "" {
		p.log("error", "empty target")
		return
	}

	// Resolve binaries first (pre-flight). Skip stages whose binary is unavailable.
	subBin := ""
	httpxBin := ""
	naabuBin := ""
	nucleiBin := ""
	if picked["subfinder"] { subBin    = p.resolveTool("subfinder") }
	if picked["httpx"]     { httpxBin  = p.resolveTool("httpx") }
	if picked["naabu"]     { naabuBin  = p.resolveTool("naabu") }
	if picked["nuclei"]    { nucleiBin = p.resolveTool("nuclei") }

	// Optional pre-step: update nuclei templates
	if req.UpdateTpl && nucleiBin != "" {
		p.log("info", "Updating nuclei templates (-update-templates)…")
		p.runCmdStream(ctx, nucleiBin, []string{"-update-templates", "-silent"}, "nuclei", false, nil)
	}

	subdomains := make(map[string]struct{})
	liveHosts := make(map[string]struct{})

	// Always include the bare target as a candidate subdomain
	subdomains[target] = struct{}{}

	// 1. subfinder → subdomains
	if subBin != "" {
		p.log("info", "Stage 1/4: subfinder enumerating subdomains…")
		args := []string{"-d", target, "-all", "-silent"}
		p.runCmdStream(ctx, subBin, args, "subfinder", false, func(line string) {
			sub := strings.TrimSpace(line)
			if sub == "" || strings.Contains(sub, " ") {
				return
			}
			if _, dup := subdomains[sub]; dup {
				return
			}
			subdomains[sub] = struct{}{}
			p.emit(PipelineEvent{Tool: "subfinder", Type: "subdomain", Result: sub, RawOutput: line, Host: sub})
		})
		p.log("ok", fmt.Sprintf("subfinder discovered %d subdomains", len(subdomains)))
	}

	// 2. httpx → live hosts (with tech detect + status code + title)
	if httpxBin != "" {
		p.log("info", "Stage 2/4: httpx probing live hosts (tech-detect)…")
		// Feed subdomains via stdin
		hostsList := make([]string, 0, len(subdomains))
		for s := range subdomains {
			hostsList = append(hostsList, s)
		}
		args := []string{
			"-silent", "-no-color",
			"-tech-detect", "-title", "-status-code",
			"-follow-redirects", "-json",
			"-timeout", "10", "-threads", "50",
		}
		p.runCmdStreamWithStdin(ctx, httpxBin, args, "httpx", strings.Join(hostsList, "\n"),
			func(line string) {
				var rec map[string]any
				if err := json.Unmarshal([]byte(line), &rec); err != nil {
					return
				}
				u, _ := rec["url"].(string)
				if u == "" {
					return
				}
				host := stripScheme(u)
				liveHosts[host] = struct{}{}
				code := ""
				if c, ok := rec["status_code"].(float64); ok {
					code = fmt.Sprintf("%d", int(c))
				}
				title, _ := rec["title"].(string)
				tech := ""
				if t, ok := rec["tech"].([]any); ok {
					parts := []string{}
					for _, v := range t {
						if s, ok := v.(string); ok {
							parts = append(parts, s)
						}
					}
					tech = strings.Join(parts, ", ")
				}
				summary := fmt.Sprintf("%s [%s] %s", u, code, strings.TrimSpace(title))
				if tech != "" {
					summary += "  ·  " + tech
				}
				p.emit(PipelineEvent{
					Tool: "httpx", Type: "host",
					Result: summary, RawOutput: line, Host: host,
				})
			})
		p.log("ok", fmt.Sprintf("httpx confirmed %d live hosts", len(liveHosts)))
	}

	// 3. naabu → open ports (use live hosts; fallback to subdomains)
	if naabuBin != "" {
		p.log("info", "Stage 3/4: naabu scanning top 1000 ports…")
		scanList := liveHosts
		if len(scanList) == 0 {
			scanList = subdomains
		}
		hosts := make([]string, 0, len(scanList))
		for h := range scanList {
			hosts = append(hosts, stripScheme(h))
		}
		args := []string{
			"-silent", "-no-color",
			"-top-ports", "1000",
			"-rate", "1000", "-c", "50",
			"-host", strings.Join(hosts, ","),
		}
		// naabu reads -host directly; no stdin needed
		p.runCmdStream(ctx, naabuBin, args, "naabu", false, func(line string) {
			s := strings.TrimSpace(line)
			if s == "" {
				return
			}
			parts := strings.SplitN(s, ":", 2)
			host := s
			if len(parts) == 2 {
				host = parts[0]
			}
			p.emit(PipelineEvent{Tool: "naabu", Type: "port", Result: s, RawOutput: line, Host: host})
		})
	}

	// 4. nuclei → CVE / KEV / exposure / misconfig templates
	if nucleiBin != "" {
		p.log("info", "Stage 4/4: nuclei (CVE + KEV + exposure templates)…")

		// Build target list — prefer live hosts (with scheme), fall back to subdomains
		targets := make([]string, 0)
		if len(liveHosts) > 0 {
			for h := range liveHosts {
				targets = append(targets, "https://"+h)
			}
		} else {
			for s := range subdomains {
				targets = append(targets, s)
			}
		}

		tags := req.NucleiTags
		if len(tags) == 0 {
			// Sensible defaults: latest CVEs + KEV + 0-days + exposures + misconfig
			tags = []string{"cve", "kev", "0day", "exposure", "misconfig", "takeover", "default-login"}
		}
		severity := req.Severity
		if len(severity) == 0 {
			severity = []string{"critical", "high", "medium"}
		}

		args := []string{
			"-silent", "-no-color",
			"-jsonl",
			"-no-interactsh",
			"-stats", "-stats-interval", "30",
			"-rate-limit", "150",
			"-c", "25",
			"-timeout", "10",
			"-retries", "1",
			"-tags", strings.Join(tags, ","),
			"-severity", strings.Join(severity, ","),
		}
		// Pass targets via stdin
		p.runCmdStreamWithStdin(ctx, nucleiBin, args, "nuclei",
			strings.Join(targets, "\n"),
			func(line string) {
				var rec map[string]any
				if err := json.Unmarshal([]byte(line), &rec); err != nil {
					// Non-JSON noise — drop
					return
				}
				info, _ := rec["info"].(map[string]any)
				if info == nil {
					return
				}
				name, _ := info["name"].(string)
				severity, _ := info["severity"].(string)
				tplID, _ := rec["template-id"].(string)
				matched, _ := rec["matched-at"].(string)
				if matched == "" {
					if h, ok := rec["host"].(string); ok {
						matched = h
					}
				}
				// CVE extraction
				cve := ""
				if cls, ok := info["classification"].(map[string]any); ok {
					if cves, ok := cls["cve-id"].([]any); ok && len(cves) > 0 {
						if s, ok := cves[0].(string); ok {
							cve = s
						}
					}
				}
				summary := fmt.Sprintf("[%s] %s — %s", strings.ToUpper(severity), name, matched)
				if cve != "" {
					summary = fmt.Sprintf("[%s] %s [%s] — %s", strings.ToUpper(severity), cve, name, matched)
				}
				p.emit(PipelineEvent{
					Tool: "nuclei", Type: "vuln",
					Result: summary, RawOutput: line,
					Severity: severity, CVE: cve, TemplateID: tplID,
					Host: matched,
				})
			})
		p.log("ok", "nuclei finished")
	}

	p.log("ok", "pipeline complete")
}

// ---- helpers ----

func (p *ReconPipeline) runCmdStream(ctx context.Context, name string, args []string, tool string, _ bool, onLine func(string)) {
	cmd := exec.CommandContext(ctx, name, args...)
	p.execAndStream(cmd, tool, onLine)
}

func (p *ReconPipeline) runCmdStreamWithStdin(ctx context.Context, name string, args []string, tool, stdin string, onLine func(string)) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdin = strings.NewReader(stdin)
	p.execAndStream(cmd, tool, onLine)
}

func (p *ReconPipeline) execAndStream(cmd *exec.Cmd, tool string, onLine func(string)) {
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		p.log("error", fmt.Sprintf("%s pipe error: %s", tool, err))
		return
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		p.log("error", fmt.Sprintf("%s stderr pipe: %s", tool, err))
		return
	}
	if err := cmd.Start(); err != nil {
		p.log("error", fmt.Sprintf("%s not started: %s (install: `brew install %s` or `go install …`)", tool, err, tool))
		return
	}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		sc := bufio.NewScanner(stdout)
		sc.Buffer(make([]byte, 256*1024), 1024*1024)
		for sc.Scan() {
			line := sc.Text()
			p.log("info", fmt.Sprintf("[%s] %s", tool, line))
			if onLine != nil {
				onLine(line)
			}
		}
	}()
	go func() {
		defer wg.Done()
		sc := bufio.NewScanner(stderr)
		for sc.Scan() {
			line := strings.TrimSpace(sc.Text())
			if line == "" {
				continue
			}
			// nuclei -stats writes here too; mark warn for visibility
			p.log("warn", fmt.Sprintf("[%s] %s", tool, line))
		}
	}()
	wg.Wait()
	cmd.Wait()
}
