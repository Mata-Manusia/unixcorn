package api

import (
	"net/http"
	"time"
	"unixcorn/daemon/internal/db"

	"github.com/gin-gonic/gin"
)

type AIConfig struct {
	ID      int64  `json:"id"`
	UserID  int64  `json:"user_id"`
	BaseURL string `json:"base_url"`
	Model   string `json:"model"`
	APIKey  string `json:"api_key,omitempty"`
}

type AIConfigRequest struct {
	BaseURL string `json:"base_url"`
	Model   string `json:"model"`
	APIKey  string `json:"api_key"`
}

func GetAIConfig(c *gin.Context) {
	uid := UserIDFromContext(c)
	var cfg AIConfig
	err := db.DB.QueryRow(
		`SELECT id, user_id, base_url, model, api_key FROM ai_config WHERE user_id = $1`, uid,
	).Scan(&cfg.ID, &cfg.UserID, &cfg.BaseURL, &cfg.Model, &cfg.APIKey)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"configured": false})
		return
	}
	cfg.APIKey = maskKey(cfg.APIKey)
	c.JSON(http.StatusOK, gin.H{
		"configured": true,
		"config":     cfg,
	})
}

func SaveAIConfig(c *gin.Context) {
	uid := UserIDFromContext(c)
	var req AIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.BaseURL == "" {
		req.BaseURL = "https://openrouter.ai/api/v1"
	}
	if req.Model == "" {
		req.Model = "openai/gpt-4o"
	}

	now := time.Now().UTC().Format(time.RFC3339)
	_, err := db.DB.Exec(
		`INSERT INTO ai_config (user_id, base_url, model, api_key, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $5)
		 ON CONFLICT (user_id) DO UPDATE SET
		   base_url = EXCLUDED.base_url,
		   model = EXCLUDED.model,
		   api_key = CASE WHEN EXCLUDED.api_key = '' THEN ai_config.api_key ELSE EXCLUDED.api_key END,
		   updated_at = EXCLUDED.updated_at`,
		uid, req.BaseURL, req.Model, req.APIKey, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved"})
}

func maskKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "****" + key[len(key)-4:]
}
