	package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Plugin struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

var registeredPlugins = []Plugin{
	{Name: "subfinder", Description: "Subdomain enumeration", Permissions: []string{"network"}},
	{Name: "httpx", Description: "HTTP probing", Permissions: []string{"network"}},
	{Name: "naabu", Description: "Port scanning", Permissions: []string{"network"}},
	{Name: "nuclei", Description: "Vulnerability scanning", Permissions: []string{"network", "filesystem:read"}},
	{Name: "gowitness", Description: "Screenshot collection", Permissions: []string{"network", "filesystem:write"}},
}

func ListPlugins(c *gin.Context) {
	c.JSON(http.StatusOK, registeredPlugins)
}

type RunPluginRequest struct {
	Name   string   `json:"name" binding:"required"`
	Target string   `json:"target" binding:"required"`
	Args   []string `json:"args"`
}

func RunPlugin(c *gin.Context) {
	var req RunPluginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "queued", "plugin": req.Name, "target": req.Target})
}
