package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// resourcesPath is relative to daemon's working directory (apps/daemon/)
const resourcesPath = "../resources"

type ResourceFile struct {
	Name  string `json:"name"`
	Title string `json:"title"`
}

func ListResources(c *gin.Context) {
	entries, err := os.ReadDir(resourcesPath)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"files": []ResourceFile{}})
		return
	}

	var files []ResourceFile
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		n := e.Name()
		if strings.HasSuffix(n, ".md") || strings.HasSuffix(n, ".txt") {
			files = append(files, ResourceFile{
				Name:  n,
				Title: strings.TrimSuffix(strings.TrimSuffix(n, ".md"), ".txt"),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"files": files})
}

func GetResource(c *gin.Context) {
	name := filepath.Base(c.Param("name"))
	// Only allow .md and .txt
	if !strings.HasSuffix(name, ".md") && !strings.HasSuffix(name, ".txt") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file type"})
		return
	}

	fullPath := filepath.Join(resourcesPath, name)
	data, err := os.ReadFile(fullPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"name":    name,
		"title":   strings.TrimSuffix(strings.TrimSuffix(name, ".md"), ".txt"),
		"content": string(data),
	})
}
