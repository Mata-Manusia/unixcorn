package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
	"unixcorn/daemon/internal/db"

	"github.com/gin-gonic/gin"
)

type ChatSession struct {
	ID        int64  `json:"id"`
	UserID    int64  `json:"user_id"`
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type SessionMessage struct {
	ID        int64  `json:"id"`
	SessionID int64  `json:"session_id"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	ToolCalls string `json:"tool_calls,omitempty"`
	CreatedAt string `json:"created_at"`
}

func CreateSession(c *gin.Context) {
	uid := UserIDFromContext(c)
	var req struct {
		Title string `json:"title"`
	}
	c.ShouldBindJSON(&req)
	if req.Title == "" {
		req.Title = "New Chat"
	}

	now := time.Now().UTC().Format(time.RFC3339)
	var id int64
	err := db.DB.QueryRow(
		`INSERT INTO chat_sessions (user_id, title, created_at, updated_at) VALUES ($1, $2, $3, $3) RETURNING id`,
		uid, req.Title, now,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "title": req.Title, "created_at": now})
}

func ListSessions(c *gin.Context) {
	uid := UserIDFromContext(c)
	rows, err := db.DB.Query(
		`SELECT id, title, created_at, updated_at FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50`,
		uid,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var sessions []ChatSession
	for rows.Next() {
		var s ChatSession
		s.UserID = uid
		if err := rows.Scan(&s.ID, &s.Title, &s.CreatedAt, &s.UpdatedAt); err != nil {
			continue
		}
		sessions = append(sessions, s)
	}
	if sessions == nil {
		sessions = []ChatSession{}
	}
	c.JSON(http.StatusOK, sessions)
}

func GetSessionMessages(c *gin.Context) {
	uid := UserIDFromContext(c)
	sessionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	// Verify ownership
	var ownerID int64
	if err := db.DB.QueryRow(`SELECT user_id FROM chat_sessions WHERE id = $1`, sessionID).Scan(&ownerID); err != nil || ownerID != uid {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	rows, err := db.DB.Query(
		`SELECT id, session_id, role, content, tool_calls, created_at FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`,
		sessionID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var msgs []SessionMessage
	for rows.Next() {
		var m SessionMessage
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.ToolCalls, &m.CreatedAt); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}
	if msgs == nil {
		msgs = []SessionMessage{}
	}
	c.JSON(http.StatusOK, msgs)
}

func UpdateSession(c *gin.Context) {
	uid := UserIDFromContext(c)
	sessionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}
	var ownerID int64
	if err := db.DB.QueryRow(`SELECT user_id FROM chat_sessions WHERE id = $1`, sessionID).Scan(&ownerID); err != nil || ownerID != uid {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}
	var req struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title required"})
		return
	}
	db.DB.Exec(`UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2`, req.Title, sessionID)
	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func DeleteSession(c *gin.Context) {
	uid := UserIDFromContext(c)
	sessionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	var ownerID int64
	if err := db.DB.QueryRow(`SELECT user_id FROM chat_sessions WHERE id = $1`, sessionID).Scan(&ownerID); err != nil || ownerID != uid {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	db.DB.Exec(`DELETE FROM chat_sessions WHERE id = $1`, sessionID)
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// SaveMessage persists a chat message to the session.
func SaveMessage(sessionID int64, role, content string, toolCalls any) {
	tc := ""
	if toolCalls != nil {
		if b, err := json.Marshal(toolCalls); err == nil {
			tc = string(b)
		}
	}
	now := time.Now().UTC().Format(time.RFC3339)
	db.DB.Exec(
		`INSERT INTO chat_messages (session_id, role, content, tool_calls, created_at) VALUES ($1, $2, $3, $4, $5)`,
		sessionID, role, content, tc, now,
	)
	db.DB.Exec(
		`UPDATE chat_sessions SET updated_at = $1 WHERE id = $2`,
		now, sessionID,
	)
}

// UpdateSessionTitle sets session title to first user message (truncated).
func UpdateSessionTitle(sessionID int64, title string) {
	if len(title) > 60 {
		title = title[:60] + "..."
	}
	db.DB.Exec(`UPDATE chat_sessions SET title = $1 WHERE id = $2`, title, sessionID)
}
