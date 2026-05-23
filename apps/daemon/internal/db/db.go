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

	log.Println("[db] initialized:", path)
	return nil
}

func migrate() error {
	schema := `
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
	`
	_, err := DB.Exec(schema)
	return err
}
