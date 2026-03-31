package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/service"
)

// IngestHandler handles data coming in from the Agent (Module 1) and
// the Network & Device Monitor (Module 4).
type IngestHandler struct {
	devices *service.DeviceService
	metrics *service.MetricService
}

func NewIngestHandler(devices *service.DeviceService, metrics *service.MetricService) *IngestHandler {
	return &IngestHandler{devices: devices, metrics: metrics}
}

// Metrics godoc
// POST /api/v1/ingest/metrics
// Accepts a batch of metrics from an agent or network monitor.
func (h *IngestHandler) Metrics(c *gin.Context) {
	var req service.IngestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deviceType := req.Type
	if deviceType == "" {
		deviceType = models.DeviceTypeServer // default for agent
	}

	// Resolve or auto-create the device.
	device, err := h.devices.EnsureDevice(req.Hostname, req.IPAddress, deviceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve device: " + err.Error()})
		return
	}

	ts := time.Now()
	if req.Timestamp != nil {
		ts = *req.Timestamp
	}

	if err := h.metrics.Ingest(device.ID, device.Type, req.Metrics, ts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store metrics: " + err.Error()})
		return
	}

	// Update device status to online.
	_ = h.devices.ProcessHeartbeat(device.ID)

	c.JSON(http.StatusAccepted, gin.H{"device_id": device.ID, "accepted": len(req.Metrics)})
}

// Heartbeat godoc
// POST /api/v1/ingest/heartbeat
// Signals that a device is alive (no metric data needed).
func (h *IngestHandler) Heartbeat(c *gin.Context) {
	var req service.HeartbeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deviceType := req.Type
	if deviceType == "" {
		deviceType = models.DeviceTypeServer
	}

	device, err := h.devices.EnsureDevice(req.Hostname, req.IPAddress, deviceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve device: " + err.Error()})
		return
	}

	if err := h.devices.ProcessHeartbeat(device.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"device_id": device.ID, "status": "online"})
}
