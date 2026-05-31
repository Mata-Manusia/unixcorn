package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init(path string) error {
	var err error
	DB, err = sql.Open("sqlite3", path)
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
		"ALTER TABLE find_targets ADD COLUMN status_code INTEGER DEFAULT 0",
		"ALTER TABLE find_targets ADD COLUMN title TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN tech TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN ip TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN final_url TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN findings TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN headers TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN dork_hits TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN open_ports TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN tests TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN offline_reason TEXT DEFAULT ''",
		"ALTER TABLE find_targets ADD COLUMN match_reason TEXT DEFAULT ''",
		"ALTER TABLE scans ADD COLUMN user_id INTEGER DEFAULT 0",
		"ALTER TABLE exploit_scans ADD COLUMN user_id INTEGER DEFAULT 0",
		"ALTER TABLE find_scans ADD COLUMN user_id INTEGER DEFAULT 0",
		"ALTER TABLE exploit_vulns ADD COLUMN evidence TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN impact TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN cwe TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN owasp TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN remediation TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN refs TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN attack_chain TEXT DEFAULT ''",
		"ALTER TABLE exploit_vulns ADD COLUMN exploit_code TEXT DEFAULT ''",
	} {
		DB.Exec(col) // ignore error — column may already exist
	}

	log.Println("[db] initialized:", path)
	return nil
}

func migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		username      TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS scans (
		id          TEXT PRIMARY KEY,
		target      TEXT NOT NULL,
		status      TEXT NOT NULL DEFAULT 'pending',
		created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
		finished_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS scan_results (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_id    TEXT NOT NULL,
		tool       TEXT NOT NULL,
		type       TEXT NOT NULL,
		result     TEXT,
		raw_output TEXT,
		FOREIGN KEY (scan_id) REFERENCES scans(id)
	);

	CREATE TABLE IF NOT EXISTS logs (
		id        INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_id   TEXT,
		level     TEXT NOT NULL DEFAULT 'info',
		message   TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS exploit_scans (
		id          TEXT PRIMARY KEY,
		target      TEXT NOT NULL,
		phases      TEXT NOT NULL DEFAULT '1,2,3,4',
		status      TEXT NOT NULL DEFAULT 'pending',
		created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
		finished_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS exploit_vulns (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_id     TEXT NOT NULL,
		severity    TEXT NOT NULL,
		name        TEXT NOT NULL,
		endpoint    TEXT NOT NULL,
		description TEXT,
		poc         TEXT,
		cve         TEXT,
		cvss        TEXT,
		timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (scan_id) REFERENCES exploit_scans(id)
	);

	CREATE TABLE IF NOT EXISTS find_scans (
		id          TEXT PRIMARY KEY,
		category    TEXT NOT NULL,
		tlds        TEXT NOT NULL,
		vuln_types  TEXT NOT NULL,
		status      TEXT NOT NULL DEFAULT 'running',
		total       INTEGER DEFAULT 0,
		created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
		finished_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS find_targets (
		id        INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_id   TEXT NOT NULL,
		domain    TEXT NOT NULL,
		category  TEXT NOT NULL,
		indicator TEXT,
		source    TEXT,
		status    TEXT DEFAULT 'unknown',
		FOREIGN KEY (scan_id) REFERENCES find_scans(id)
	);
	`
	_, err := DB.Exec(schema)
	return err
}
