package api

import (
	"database/sql"
	"net/http"
	"unixcorn/daemon/internal/db"

	"github.com/gin-gonic/gin"
)

func GetLogs(c *gin.Context) {
	scanID := c.Query("scan_id")
	var rows *sql.Rows
	var err error

	if scanID != "" {
		rows, err = db.DB.Query(
			"SELECT id, scan_id, level, message, timestamp FROM logs WHERE scan_id = ? ORDER BY timestamp DESC LIMIT 500",
			scanID,
		)
	} else {
		rows, err = db.DB.Query(
			"SELECT id, scan_id, level, message, timestamp FROM logs ORDER BY timestamp DESC LIMIT 500",
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
