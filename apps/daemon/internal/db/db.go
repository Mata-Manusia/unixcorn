package db

import (
	"database/sql"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

func Init(connStr string) error {
	var err error
	DB, err = sql.Open("pgx", connStr)
	if err != nil {
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	if err = migrate(); err != nil {
		return err
	}

	for _, col := range []string{
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS status_code INTEGER DEFAULT 0",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS title TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS tech TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS ip TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS final_url TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS findings TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS headers TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS dork_hits TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS open_ports TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS tests TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS offline_reason TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN IF NOT EXISTS match_reason TEXT DEFAULT ''",
		"ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 0",
		"ALTER TABLE exploit_scans ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 0",
		"ALTER TABLE find_scans ADD COLUMN IF NOT EXISTS user_id INTEGER DEFAULT 0",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS evidence TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS impact TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS cwe TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS owasp TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS remediation TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS refs TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS attack_chain TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS exploit_code TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS nuclei TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS exploit_hint TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN IF NOT EXISTS cves TEXT DEFAULT ''",
	} {
		DB.Exec(col)
	}

	log.Println("[db] initialized")
	return nil
}

func migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id            BIGSERIAL PRIMARY KEY,
		username      TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS scans (
		id          TEXT PRIMARY KEY,
		target      TEXT NOT NULL,
		status      TEXT NOT NULL DEFAULT 'pending',
		created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		finished_at TIMESTAMPTZ
	);

	CREATE TABLE IF NOT EXISTS scan_results (
		id         BIGSERIAL PRIMARY KEY,
		scan_id    TEXT NOT NULL,
		tool       TEXT NOT NULL,
		type       TEXT NOT NULL,
		result     TEXT,
		raw_output TEXT,
		FOREIGN KEY (scan_id) REFERENCES scans(id)
	);

	CREATE TABLE IF NOT EXISTS logs (
		id        BIGSERIAL PRIMARY KEY,
		scan_id   TEXT,
		level     TEXT NOT NULL DEFAULT 'info',
		message   TEXT NOT NULL,
		timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS exploit_scans (
		id          TEXT PRIMARY KEY,
		target      TEXT NOT NULL,
		phases      TEXT NOT NULL DEFAULT '1,2,3,4',
		status      TEXT NOT NULL DEFAULT 'pending',
		created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		finished_at TIMESTAMPTZ
	);

	CREATE TABLE IF NOT EXISTS exploit_vulns (
		id          BIGSERIAL PRIMARY KEY,
		scan_id     TEXT NOT NULL,
		severity    TEXT NOT NULL,
		name        TEXT NOT NULL,
		endpoint    TEXT NOT NULL,
		description TEXT,
		poc         TEXT,
		cve         TEXT,
		cvss        TEXT,
		timestamp   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (scan_id) REFERENCES exploit_scans(id)
	);

	CREATE TABLE IF NOT EXISTS find_scans (
		id          TEXT PRIMARY KEY,
		category    TEXT NOT NULL,
		tlds        TEXT NOT NULL,
		vuln_types  TEXT NOT NULL,
		status      TEXT NOT NULL DEFAULT 'running',
		total       INTEGER DEFAULT 0,
		created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		finished_at TIMESTAMPTZ
	);

	CREATE TABLE IF NOT EXISTS find_targets (
		id        BIGSERIAL PRIMARY KEY,
		scan_id   TEXT NOT NULL,
		domain    TEXT NOT NULL,
		category  TEXT NOT NULL,
		indicator TEXT,
		source    TEXT,
		status    TEXT DEFAULT 'unknown',
		FOREIGN KEY (scan_id) REFERENCES find_scans(id)
	);

	CREATE TABLE IF NOT EXISTS ai_config (
		id         BIGSERIAL PRIMARY KEY,
		user_id    INTEGER NOT NULL REFERENCES users(id) UNIQUE,
		base_url   TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
		model      TEXT NOT NULL DEFAULT 'openai/gpt-4o',
		api_key    TEXT NOT NULL,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := DB.Exec(schema)
	return err
}
