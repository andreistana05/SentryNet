package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/service"
)

type DeviceHandler struct {
	devices *service.DeviceService
	metrics *service.MetricService
}

func NewDeviceHandler(devices *service.DeviceService, metrics *service.MetricService) *DeviceHandler {
	return &DeviceHandler{devices: devices, metrics: metrics}
}

// List godoc
// GET /api/v1/devices
func (h *DeviceHandler) List(c *gin.Context) {
	filter := repository.DeviceFilter{
		Type:   models.DeviceType(c.Query("type")),
		Status: models.DeviceStatus(c.Query("status")),
		Search: c.Query("search"),
	}

	devices, err := h.devices.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": devices, "count": len(devices)})
}

// ListNew godoc
// GET /api/v1/devices/new?since=<RFC3339 or duration>
// Examples:
//
//	?since=2024-01-15T10:00:00Z   — absolute timestamp (RFC3339)
//	?since=24h                    — last 24 hours
//	?since=7d                     — last 7 days
func (h *DeviceHandler) ListNew(c *gin.Context) {
	raw := c.Query("since")
	if raw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query param 'since' is required (RFC3339 timestamp or duration like 24h, 7d)"})
		return
	}

	var since time.Time
	// Try duration first (e.g. "24h", "7d")
	if raw[len(raw)-1] == 'd' {
		days, err := time.ParseDuration(raw[:len(raw)-1] + "h")
		if err == nil {
			since = time.Now().Add(-days * 24)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid duration: use formats like 24h or 7d"})
			return
		}
	} else if d, err := time.ParseDuration(raw); err == nil {
		since = time.Now().Add(-d)
	} else if t, err := time.Parse(time.RFC3339, raw); err == nil {
		since = t
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid 'since' value: use RFC3339 (2024-01-15T10:00:00Z) or duration (24h, 7d)"})
		return
	}

	filter := repository.DeviceFilter{
		Type:   models.DeviceType(c.Query("type")),
		Status: models.DeviceStatus(c.Query("status")),
		Since:  &since,
	}

	devices, err := h.devices.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": devices, "count": len(devices), "since": since.UTC().Format(time.RFC3339)})
}

// Create godoc
// POST /api/v1/devices
func (h *DeviceHandler) Create(c *gin.Context) {
	var req service.CreateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.devices.Create(req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, device)
}

// Get godoc
// GET /api/v1/devices/:id
func (h *DeviceHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	device, err := h.devices.Get(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, device)
}

// Update godoc
// PUT /api/v1/devices/:id
func (h *DeviceHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	var req service.UpdateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.devices.Update(id, req)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, device)
}

// Delete godoc
// DELETE /api/v1/devices/:id
func (h *DeviceHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	if err := h.devices.Delete(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetMetrics godoc
// GET /api/v1/devices/:id/metrics
func (h *DeviceHandler) GetMetrics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	if _, err := h.devices.Get(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
		return
	}

	metrics, err := h.metrics.GetLatestByDevice(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": metrics, "count": len(metrics)})
}
