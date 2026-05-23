package main

import (
	"context"
	"log"
	"net/http"
	"unixcorn/daemon/internal/api"
	"unixcorn/daemon/internal/db"
	"unixcorn/daemon/internal/plugin"
	"unixcorn/daemon/internal/worker"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := db.Init("./storage/unixcorn.db"); err != nil {
		log.Fatal("[db] init failed:", err)
	}

	runtime := plugin.NewRuntime(func(out plugin.OutputLine) {
		level := "info"
		if out.IsError {
			level = "error"
		}
		db.DB.Exec(
			"INSERT INTO logs (scan_id, level, message) VALUES (?, ?, ?)",
			out.ScanID, level, out.Line,
		)
		api.Broadcast(api.WSEvent{
			Type:    "scan.log",
			ScanID:  out.ScanID,
			Tool:    out.Tool,
			Message: out.Line,
		})
	})

	q := worker.NewQueue(4, func(ctx context.Context, job worker.Job) {
		api.Broadcast(api.WSEvent{Type: "scan.progress", ScanID: job.ID, Message: "Running tools..."})
		for _, tool := range job.Tools {
			select {
			case <-ctx.Done():
				log.Printf("[worker] job %s cancelled", job.ID)
				return
			default:
			}
			if err := runtime.RunContext(ctx, job.ID, tool, []string{job.Target}); err != nil {
				log.Printf("[worker] tool %s failed: %v", tool, err)
			}
		}
		// Only mark completed if not already stopped
		var status string
		db.DB.QueryRow("SELECT status FROM scans WHERE id=?", job.ID).Scan(&status)
		if status != "stopped" {
			db.DB.Exec("UPDATE scans SET status='completed', finished_at=CURRENT_TIMESTAMP WHERE id=?", job.ID)
			api.Broadcast(api.WSEvent{Type: "scan.completed", ScanID: job.ID, Message: "Scan complete"})
		}
	})
	q.Start()
	api.SetQueue(q)

	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	r.GET("/ws", func(c *gin.Context) {
		api.WSHandler(c.Writer, c.Request)
	})

	v1 := r.Group("/api")
	{
		v1.POST("/recon/start", api.StartRecon)
		v1.POST("/recon/:id/stop", api.StopRecon)
		v1.GET("/recon", api.ListScans)
		v1.GET("/recon/:id", api.GetScan)
		v1.GET("/recon/:id/results", api.GetScanResults)
		v1.GET("/logs", api.GetLogs)
		v1.GET("/plugins", api.ListPlugins)
		v1.POST("/plugins/run", api.RunPlugin)

		v1.POST("/exploit/start", api.StartExploit)
		v1.POST("/exploit/:id/stop", api.StopExploit)
		v1.GET("/exploit", api.ListExploitScans)
		v1.GET("/exploit/:id", api.GetExploitScan)
		v1.GET("/exploit/:id/vulns", api.GetExploitVulns)
	}

	log.Println("[daemon] listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
