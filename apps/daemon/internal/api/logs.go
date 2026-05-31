package api

import (
	"database/sql"
	"net/http"
	"unixcorn/daemon/internal/db"

	"github.com/gin-gonic/gin"
)

// GetLogs returns logs scoped to the calling user.
// Logs belong to scan_id; ownership flows via scans.user_id OR exploit_scans.user_id.
func GetLogs(c *gin.Context) {
	uid := UserIDFromContext(c)
	scanID := c.Query("scan_id")
	var rows *sql.Rows
	var err error

	if scanID != "" {
		// Verify the requested scan belongs to this user (recon OR exploit).
		var owner int64
		err = db.DB.QueryRow(
			`SELECT user_id FROM scans WHERE id = ?
			 UNION
			 SELECT user_id FROM exploit_scans WHERE id = ?
			 LIMIT 1`,
			scanID, scanID,
		).Scan(&owner)
		if err != nil || owner != uid {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		rows, err = db.DB.Query(
			"SELECT id, scan_id, level, message, timestamp FROM logs WHERE scan_id = ? ORDER BY timestamp DESC LIMIT 500",
			scanID,
		)
	} else {
		// Aggregate view — only logs whose scan_id belongs to this user.
		rows, err = db.DB.Query(
			`SELECT l.id, l.scan_id, l.level, l.message, l.timestamp
			 FROM logs l
			 WHERE l.scan_id IN (
			   SELECT id FROM scans         WHERE user_id = ?
			   UNION
			   SELECT id FROM exploit_scans WHERE user_id = ?
			 )
			 ORDER BY l.timestamp DESC
			 LIMIT 500`,
			uid, uid,
		)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var logs []map[string]any
	for rows.Next() {
		var id int
		var scanIDVal *string
		var level, message, timestamp string
		if err := rows.Scan(&id, &scanIDVal, &level, &message, &timestamp); err != nil {
			continue
		}
		logs = append(logs, map[string]any{
			"id": id, "scan_id": scanIDVal,
			"level": level, "message": message, "timestamp": timestamp,
		})
	}
	if logs == nil {
		logs = []map[string]any{}
	}
	c.JSON(http.StatusOK, logs)
}
