package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
	"unixcorn/daemon/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FindRequest struct {
	Category  string   `json:"category"`
	TLDs      []string `json:"tlds"`
	VulnTypes []string `json:"vuln_types"`
}

type FoundTarget struct {
	Domain     string `json:"domain"`
	Category   string `json:"category"`
	Indicator  string `json:"indicator"`
	Source     string `json:"source"`
	Status     string `json:"status"`
	StatusCode int    `json:"status_code"`
	Title      string `json:"title"`
	Tech       string `json:"tech"`
	IP         string `json:"ip"`
	FinalURL   string `json:"final_url"`
}

type crtEntry struct {
	NameValue string `json:"name_value"`
}

var osintClient = &http.Client{Timeout: 8 * time.Second}
var titleRe = regexp.MustCompile(`(?i)<title[^>]*>([^<]{1,200})`)

var techPatterns = []struct {
	name    string
	pattern string
}{
	{"WordPress", "wp-content"},
	{"WordPress", "wp-includes"},
	{"Joomla", "/components/com_"},
	{"Joomla", "joomla"},
	{"Drupal", "Drupal.settings"},
	{"Laravel", "laravel_session"},
	{"Laravel", "XSRF-TOKEN"},
	{"CodeIgniter", "ci_session"},
	{"jQuery", "jquery"},
	{"Bootstrap", "bootstrap"},
}

var probeClient = &http.Client{
	Timeout: 7 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

type probeInfo struct {
	alive      bool
	statusCode int
	server     string
	powered    string
	title      string
	tech       []string
	ip         string
	finalURL   string
}

func probeTarget(domain string) probeInfo {
	// DNS lookup
	addrs, _ := net.LookupHost(domain)
	ip := ""
	if len(addrs) > 0 {
		ip = addrs[0]
	}

	for _, scheme := range []string{"https", "http"} {
		reqURL := fmt.Sprintf("%s://%s", scheme, domain)
		req, err := http.NewRequest("GET", reqURL, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Unixcorn/1.0)")
		resp, err := probeClient.Do(req)
		if err != nil {
			continue
		}

		// Read up to 64KB for parsing
		body := make([]byte, 65536)
		n, _ := resp.Body.Read(body)
		resp.Body.Close()
		bodyStr := string(body[:n])

		info := probeInfo{
			alive:      true,
			statusCode: resp.StatusCode,
			server:     resp.Header.Get("Server"),
			powered:    resp.Header.Get("X-Powered-By"),
			ip:         ip,
			finalURL:   resp.Request.URL.String(),
		}

		// Title
		if m := titleRe.FindStringSubmatch(bodyStr); len(m) > 1 {
			info.title = strings.TrimSpace(m[1])
		}

		// Tech detection
		seen := map[string]bool{}
		bodyLower := strings.ToLower(bodyStr)
		for _, p := range techPatterns {
			if !seen[p.name] && strings.Contains(bodyLower, strings.ToLower(p.pattern)) {
				seen[p.name] = true
				info.tech = append(info.tech, p.name)
			}
		}
		// Server / powered-by as tech
		if info.server != "" && !seen[info.server] {
			info.tech = append(info.tech, info.server)
		}
		if info.powered != "" && !seen[info.powered] {
			info.tech = append(info.tech, info.powered)
		}

		return info
	}
	return probeInfo{ip: ip}
}

// queryCrtSh — certificate transparency lookup
func queryCrtSh(tld string) ([]string, string, error) {
	query := strings.ReplaceAll(tld, "*", "%")
	reqURL := fmt.Sprintf("https://crt.sh/?q=%s&output=json", url.QueryEscape(query))

	resp, err := osintClient.Get(reqURL)
	if err != nil {
		return nil, "crt.sh", fmt.Errorf("crt.sh unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "crt.sh", fmt.Errorf("crt.sh HTTP %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	var entries []crtEntry
	if err := json.Unmarshal(body, &entries); err != nil {
		return nil, "crt.sh", fmt.Errorf("crt.sh bad JSON: %w", err)
	}
	seen := map[string]bool{}
	var out []string
	for _, e := range entries {
		for _, d := range strings.Split(e.NameValue, "\n") {
			d = strings.TrimSpace(strings.TrimPrefix(d, "*."))
			if d != "" && !seen[d] && !strings.Contains(d, " ") {
				seen[d] = true
				out = append(out, d)
			}
		}
	}
	return out, "crt.sh", nil
}

// queryHackerTarget — free subdomain enumeration, no key needed
func queryHackerTarget(tld string) ([]string, string, error) {
	clean := strings.ReplaceAll(tld, "*.", "") // "*.go.id" → "go.id"
	reqURL := fmt.Sprintf("https://api.hackertarget.com/hostsearch/?q=%s", url.QueryEscape(clean))

	resp, err := osintClient.Get(reqURL)
	if err != nil {
		return nil, "hackertarget", fmt.Errorf("hackertarget unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "hackertarget", fmt.Errorf("hackertarget HTTP %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	text := strings.TrimSpace(string(body))
	firstLine := strings.SplitN(text, "\n", 2)[0]
	if !strings.Contains(firstLine, ",") {
		// response is an error message, not CSV
		return nil, "hackertarget", fmt.Errorf("hackertarget: %s", firstLine)
	}
	seen := map[string]bool{}
	var out []string
	for _, line := range strings.Split(text, "\n") {
		parts := strings.SplitN(line, ",", 2)
		if len(parts) < 1 {
			continue
		}
		d := strings.TrimSpace(parts[0])
		if d != "" && !seen[d] && strings.HasSuffix(d, clean) {
			seen[d] = true
			out = append(out, d)
		}
	}
	return out, "hackertarget", nil
}

// queryCertspotter — certificate transparency via Certspotter (free, no key)
func queryCertspotter(tld string) ([]string, string, error) {
	clean := strings.ReplaceAll(tld, "*.", "")
	reqURL := fmt.Sprintf(
		"https://api.certspotter.com/v1/issuances?domain=%s&expand=dns_names&include_subdomains=true",
		url.QueryEscape(clean),
	)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(reqURL)
	if err != nil {
		return nil, "certspotter", fmt.Errorf("certspotter unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "certspotter", fmt.Errorf("certspotter HTTP %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	var entries []struct {
		DNSNames []string `json:"dns_names"`
	}
	if err := json.Unmarshal(body, &entries); err != nil {
		return nil, "certspotter", fmt.Errorf("certspotter bad JSON: %w", err)
	}
	seen := map[string]bool{}
	var out []string
	for _, e := range entries {
		for _, d := range e.DNSNames {
			d = strings.TrimPrefix(d, "*.")
			if d != "" && !seen[d] && strings.HasSuffix(d, clean) {
				seen[d] = true
				out = append(out, d)
			}
		}
	}
	return out, "certspotter", nil
}

// queryWithFallback — try crt.sh → hackertarget → bufferover
func queryWithFallback(tld string) (domains []string, source string, errs []string) {
	funcs := []func(string) ([]string, string, error){
		queryCrtSh,
		queryHackerTarget,
		queryCertspotter,
	}
	for _, fn := range funcs {
		d, src, err := fn(tld)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s[%s]: %s", tld, src, err.Error()))
			continue
		}
		return d, src, errs
	}
	return nil, "all-failed", errs
}

func DeepSearch(c *gin.Context) {
	var req FindRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(req.TLDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tlds required"})
		return
	}

	// 1. OSINT — query each TLD concurrently with fallback chain
	type tldResult struct {
		tld     string
		source  string
		domains []string
		errs    []string
	}
	tldCh := make(chan tldResult, len(req.TLDs))
	var wgOSINT sync.WaitGroup
	for _, tld := range req.TLDs {
		wgOSINT.Add(1)
		go func(t string) {
			defer wgOSINT.Done()
			domains, src, errs := queryWithFallback(t)
			tldCh <- tldResult{tld: t, source: src, domains: domains, errs: errs}
		}(tld)
	}
	wgOSINT.Wait()
	close(tldCh)

	// 2. Deduplicate
	seen := map[string]bool{}
	type rawDomain struct {
		domain string
		tld    string
		source string
	}
	var raw []rawDomain
	var sourceErrors []string
	for res := range tldCh {
		sourceErrors = append(sourceErrors, res.errs...)
		for _, d := range res.domains {
			if !seen[d] {
				seen[d] = true
				raw = append(raw, rawDomain{domain: d, tld: res.tld, source: res.source})
			}
		}
	}

	// 3. Probe alive — cap 200, 20 concurrent
	if len(raw) > 200 {
		raw = raw[:200]
	}
	type probeResult struct {
		domain string
		tld    string
		source string
		info   probeInfo
	}
	probeCh := make(chan probeResult, len(raw))
	sem := make(chan struct{}, 20)
	var wgProbe sync.WaitGroup
	for _, r := range raw {
		wgProbe.Add(1)
		go func(d rawDomain) {
			defer wgProbe.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			probeCh <- probeResult{
				domain: d.domain, tld: d.tld, source: d.source,
				info: probeTarget(d.domain),
			}
		}(r)
	}
	wgProbe.Wait()
	close(probeCh)

	// 4. Build targets
	var targets []FoundTarget
	for res := range probeCh {
		i := res.info
		status := "offline"
		if i.alive {
			status = "online"
		}
		indicator := "passive-dns"
		if len(i.tech) > 0 {
			indicator = strings.Join(i.tech, ", ")
		}
		targets = append(targets, FoundTarget{
			Domain:     res.domain,
			Category:   req.Category,
			Indicator:  indicator,
			Source:     fmt.Sprintf("%s (%s)", res.source, res.tld),
			Status:     status,
			StatusCode: i.statusCode,
			Title:      i.title,
			Tech:       strings.Join(i.tech, ", "),
			IP:         i.ip,
			FinalURL:   i.finalURL,
		})
	}
	if targets == nil {
		targets = []FoundTarget{}
	}
	if sourceErrors == nil {
		sourceErrors = []string{}
	}

	// 5. Persist to DB
	tldsJSON, _ := json.Marshal(req.TLDs)
	vulnsJSON, _ := json.Marshal(req.VulnTypes)
	scanID := uuid.New().String()
	now := time.Now().UTC().Format(time.RFC3339)

	db.DB.Exec(
		`INSERT INTO find_scans (id, category, tlds, vuln_types, status, total, finished_at)
		 VALUES (?, ?, ?, ?, 'completed', ?, ?)`,
		scanID, req.Category, string(tldsJSON), string(vulnsJSON), len(targets), now,
	)

	for _, t := range targets {
		db.DB.Exec(
			`INSERT INTO find_targets (scan_id, domain, category, indicator, source, status, status_code, title, tech, ip, final_url)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			scanID, t.Domain, t.Category, t.Indicator, t.Source, t.Status,
			t.StatusCode, t.Title, t.Tech, t.IP, t.FinalURL,
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"scan_id": scanID,
		"targets": targets,
		"count":   len(targets),
		"errors":  sourceErrors,
	})
}

func ListFindScans(c *gin.Context) {
	rows, err := db.DB.Query(
		`SELECT id, category, tlds, vuln_types, status, total, created_at, finished_at
		 FROM find_scans ORDER BY created_at DESC LIMIT 50`,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var scans []map[string]any
	for rows.Next() {
		var id, category, tlds, vulnTypes, status string
		var total int
		var createdAt string
		var finishedAt *string
		if err := rows.Scan(&id, &category, &tlds, &vulnTypes, &status, &total, &createdAt, &finishedAt); err != nil {
			continue
		}
		var tldsArr, vulnsArr []string
		json.Unmarshal([]byte(tlds), &tldsArr)
		json.Unmarshal([]byte(vulnTypes), &vulnsArr)
		scans = append(scans, map[string]any{
			"id": id, "category": category, "tlds": tldsArr,
			"vuln_types": vulnsArr, "status": status, "total": total,
			"created_at": createdAt, "finished_at": finishedAt,
		})
	}
	if scans == nil {
		scans = []map[string]any{}
	}
	c.JSON(http.StatusOK, scans)
}

func GetFindTargets(c *gin.Context) {
	id := c.Param("id")
	rows, err := db.DB.Query(
		`SELECT id, domain, category, indicator, source, status,
		        COALESCE(status_code,0), COALESCE(title,''), COALESCE(tech,''), COALESCE(ip,''), COALESCE(final_url,'')
		 FROM find_targets WHERE scan_id = ? ORDER BY status DESC, domain ASC`,
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var targets []map[string]any
	for rows.Next() {
		var rowID, statusCode int
		var domain, category, indicator, source, status, title, tech, ip, finalURL string
		if err := rows.Scan(&rowID, &domain, &category, &indicator, &source, &status,
			&statusCode, &title, &tech, &ip, &finalURL); err != nil {
			continue
		}
		targets = append(targets, map[string]any{
			"id": rowID, "domain": domain, "category": category,
			"indicator": indicator, "source": source, "status": status,
			"status_code": statusCode, "title": title, "tech": tech,
			"ip": ip, "final_url": finalURL,
		})
	}
	if targets == nil {
		targets = []map[string]any{}
	}
	c.JSON(http.StatusOK, targets)
}
