package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/service"
)

// IngestHandler handles data coming in from the Agent (Module 1) and
// the Network & Device Monitor (Module 4).
type IngestHandler struct {
	devices *service.DeviceService
	metrics *service.MetricService
	alarms  *service.AlarmService
}

func NewIngestHandler(devices *service.DeviceService, metrics *service.MetricService, alarms *service.AlarmService) *IngestHandler {
	return &IngestHandler{devices: devices, metrics: metrics, alarms: alarms}
}

// EventRequest is the payload sent by the monitor or agent to fire (or resolve)
// an alarm directly — without waiting for a sustained metric threshold.
type EventRequest struct {
	Hostname    string            `json:"hostname"`
	IPAddress   string            `json:"ip_address" binding:"required"`
	DeviceType  models.DeviceType `json:"device_type"`
	EventType   string            `json:"event_type" binding:"required"`
	Severity    string            `json:"severity"`    // "high" | "medium" | "low"
	Group       string            `json:"group"`       // assigned team, optional
	Description string            `json:"description"` // human-readable detail
	Resolve     bool              `json:"resolve"`     // true → close the alarm
}

// Event godoc
// POST /api/v1/ingest/event
// Creates or resolves an alarm directly from an agent/monitor event.
func (h *IngestHandler) Event(c *gin.Context) {
	var req EventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deviceType := req.DeviceType
	if deviceType == "" {
		deviceType = models.DeviceTypeServer
	}

	// Resolve or auto-create the device so events register it in the inventory.
	device, err := h.devices.EnsureDevice(req.Hostname, req.IPAddress, deviceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve device: " + err.Error()})
		return
	}

	// Build a stable alarm name from event type + device ID.
	alarmName := fmt.Sprintf("%s (device:%s)", req.EventType, device.ID)

	priority := severityToPriority(req.Severity)
	group := req.Group
	if group == "" {
		group = defaultGroup(req.EventType)
	}

	h.alarms.IngestEvent(alarmName, priority, group, req.Resolve)

	c.JSON(http.StatusAccepted, gin.H{
		"device_id":  device.ID,
		"alarm_name": alarmName,
		"resolve":    req.Resolve,
	})
}

// severityToPriority converts the string severity from the request into the
// internal TicketPriority used by the alarm service.
func severityToPriority(s string) models.TicketPriority {
	switch s {
	case "high":
		return models.PriorityHigh
	case "low":
		return models.PriorityLow
	default:
		return models.PriorityMedium
	}
}

// defaultGroup returns a sensible assigned group based on the event type.
func defaultGroup(eventType string) string {
	switch eventType {
	case "device_offline", "ping_failure":
		return "IT Support"
	case "port_down", "connectivity_loss":
		return "Network Team"
	default:
		return "IT Support"
	}
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

// Devices godoc
// GET /api/v1/ingest/devices
// Returns all registered devices so the monitor knows what to ping.
func (h *IngestHandler) Devices(c *gin.Context) {
	devices, err := h.devices.List(repository.DeviceFilter{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": devices, "count": len(devices)})
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
