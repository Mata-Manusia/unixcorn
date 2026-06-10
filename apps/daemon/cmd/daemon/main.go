package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"
	"unixcorn/daemon/internal/api"
	"unixcorn/daemon/internal/db"
	"unixcorn/daemon/internal/plugin"
	"unixcorn/daemon/internal/worker"

	"github.com/gin-gonic/gin"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://localhost:5432/unixcorn?sslmode=disable"
	}
	if err := db.Init(connStr); err != nil {
		log.Fatal("[db] init failed:", err)
	}

	_ = plugin.NewRuntime(nil) // legacy runtime kept for plugin handlers; recon uses ReconPipeline

	q := worker.NewQueue(4, func(ctx context.Context, job worker.Job) {
		api.Broadcast(api.WSEvent{Type: "scan.progress", ScanID: job.ID, Message: "Running recon pipeline..."})

		pipe := plugin.NewReconPipeline(
			func(ev plugin.PipelineEvent) {
				// Persist structured result row
				db.DB.Exec(
					"INSERT INTO scan_results (scan_id, tool, type, result, raw_output) VALUES ($1, $2, $3, $4, $5)",
					job.ID, ev.Tool, ev.Type, ev.Result, ev.RawOutput,
				)
				api.Broadcast(api.WSEvent{
					Type:    "scan.result",
					ScanID:  job.ID,
					Tool:    ev.Tool,
					Message: ev.Result,
				})
			},
			func(level, line string) {
				db.DB.Exec(
					"INSERT INTO logs (scan_id, level, message) VALUES ($1, $2, $3)",
					job.ID, level, line,
				)
				api.Broadcast(api.WSEvent{
					Type: "scan.log", ScanID: job.ID, Message: line,
				})
			},
		)
		pipe.Run(ctx, plugin.PipelineRequest{
			ScanID:     job.ID,
			Target:     job.Target,
			Tools:      job.Tools,
			NucleiTags: job.NucleiTags,
			Severity:   job.Severity,
			UpdateTpl:  job.UpdateTpl,
		})

		var status string
		db.DB.QueryRow("SELECT status FROM scans WHERE id=$1", job.ID).Scan(&status)
		if status != "stopped" {
			db.DB.Exec("UPDATE scans SET status='completed', finished_at=CURRENT_TIMESTAMP WHERE id=$1", job.ID)
			api.Broadcast(api.WSEvent{Type: "scan.completed", ScanID: job.ID, Message: "Scan complete"})
		}
	})
	q.Start()
	api.SetQueue(q)

	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
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

	// Public auth routes
	pub := r.Group("/api")
	{
		pub.POST("/auth/register", api.Register)
		pub.POST("/auth/login", api.Login)
	}

	// Protected routes — require Bearer JWT
	v1 := r.Group("/api")
	v1.Use(api.AuthMiddleware())
	{
		v1.GET("/auth/me", api.Me)

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

		v1.POST("/find/deepsearch", api.DeepSearch)
		v1.GET("/find/scans", api.ListFindScans)
		v1.GET("/find/:id/targets", api.GetFindTargets)

		v1.GET("/ai/config", api.GetAIConfig)
		v1.POST("/ai/config", api.SaveAIConfig)
		v1.POST("/ai/chat", api.ChatHandler)

		v1.GET("/ai/sessions", api.ListSessions)
		v1.POST("/ai/sessions", api.CreateSession)
		v1.GET("/ai/sessions/:id/messages", api.GetSessionMessages)
		v1.GET("/ai/sessions/:id/stream", api.StreamSession)
		v1.GET("/ai/sessions/:id/active", api.ActiveSessionHandler)
		v1.POST("/ai/sessions/:id/stop", api.StopSessionHandler)
		v1.GET("/ai/sessions/:id/workspace", api.WorkspaceListHandler)
		v1.GET("/ai/sessions/:id/workspace/:filename", api.WorkspaceFileHandler)
		v1.PATCH("/ai/sessions/:id", api.UpdateSession)
		v1.DELETE("/ai/sessions/:id", api.DeleteSession)

		v1.GET("/resources", api.ListResources)
		v1.GET("/resources/:name", api.GetResource)
	}

	log.Println("[daemon] listening on :8080")
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0, // SSE streams need unlimited write time
		IdleTimeout:  120 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
