package api

import (
	"net/http"
	"time"
	"unixcorn/daemon/internal/db"
	"unixcorn/daemon/internal/worker"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func StopRecon(c *gin.Context) {
	id := c.Param("id")
	uid := UserIDFromContext(c)
	var owner int64
	if db.DB.QueryRow("SELECT user_id FROM scans WHERE id = ?", id).Scan(&owner) != nil || owner != uid {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	queue.Cancel(id)
	db.DB.Exec(
		"UPDATE scans SET status='stopped', finished_at=? WHERE id=?",
		time.Now().UTC().Format(time.RFC3339), id,
	)
	Broadcast(WSEvent{Type: "scan.stopped", ScanID: id, Message: "Scan stopped"})
	c.JSON(http.StatusOK, gin.H{"status": "stopped", "id": id})
}

type StartReconRequest struct {
	Target string   `json:"target" binding:"required"`
	Tools  []string `json:"tools"`
}

var queue *worker.Queue

func SetQueue(q *worker.Queue) { queue = q }

func StartRecon(c *gin.Context) {
	var req StartReconRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Tools) == 0 {
		req.Tools = []string{"subfinder", "httpx", "naabu", "nuclei"}
	}

	id := uuid.New().String()
	uid := UserIDFromContext(c)
	_, err := db.DB.Exec(
		"INSERT INTO scans (id, target, status, user_id) VALUES (?, ?, 'running', ?)",
		id, req.Target, uid,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	queue.Enqueue(worker.Job{ID: id, Type: "recon", Target: req.Target, Tools: req.Tools})

	Broadcast(WSEvent{Type: "scan.started", ScanID: id, Message: "Scan started for " + req.Target})

	c.JSON(http.StatusOK, gin.H{"scan_id": id, "target": req.Target, "status": "running"})
}

func GetScan(c *gin.Context) {
	id := c.Param("id")
	uid := UserIDFromContext(c)
	row := db.DB.QueryRow("SELECT id, target, status, created_at, finished_at FROM scans WHERE id = ? AND user_id = ?", id, uid)

	var scan struct {
		ID         string  `json:"id"`
		Target     string  `json:"target"`
		Status     string  `json:"status"`
		CreatedAt  string  `json:"created_at"`
		FinishedAt *string `json:"finished_at"`
	}
	if err := row.Scan(&scan.ID, &scan.Target, &scan.Status, &scan.CreatedAt, &scan.FinishedAt); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "scan not found"})
		return
	}
	c.JSON(http.StatusOK, scan)
}

func GetScanResults(c *gin.Context) {
	id := c.Param("id")
	uid := UserIDFromContext(c)
	var owner int64
	if db.DB.QueryRow("SELECT user_id FROM scans WHERE id = ?", id).Scan(&owner) != nil || owner != uid {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	rows, err := db.DB.Query(
		"SELECT id, tool, type, result, raw_output FROM scan_results WHERE scan_id = ?", id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var results []map[string]any
	for rows.Next() {
		var r struct {
			ID        int     `json:"id"`
			Tool      string  `json:"tool"`
			Type      string  `json:"type"`
			Result    *string `json:"result"`
			RawOutput *string `json:"raw_output"`
		}
		if err := rows.Scan(&r.ID, &r.Tool, &r.Type, &r.Result, &r.RawOutput); err != nil {
			continue
		}
		results = append(results, map[string]any{
			"id": r.ID, "tool": r.Tool, "type": r.Type,
			"result": r.Result, "raw_output": r.RawOutput,
		})
	}

	if results == nil {
		results = []map[string]any{}
	}
	c.JSON(http.StatusOK, results)
}

func ListScans(c *gin.Context) {
	uid := UserIDFromContext(c)
	rows, err := db.DB.Query(
		"SELECT id, target, status, created_at, finished_at FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
		uid,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var scans []map[string]any
	for rows.Next() {
		var id, target, status, createdAt string
		var finishedAt *string
		if err := rows.Scan(&id, &target, &status, &createdAt, &finishedAt); err != nil {
			continue
		}
		scans = append(scans, map[string]any{
			"id": id, "target": target, "status": status,
			"created_at": createdAt, "finished_at": finishedAt,
		})
	}
	if scans == nil {
		scans = []map[string]any{}
	}
	c.JSON(http.StatusOK, scans)
}

func markScanDone(scanID string) {
	db.DB.Exec(
		"UPDATE scans SET status='completed', finished_at=? WHERE id=?",
		time.Now().UTC().Format(time.RFC3339), scanID,
	)
}
