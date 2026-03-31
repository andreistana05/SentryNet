package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/service"
)

type StatusHandler struct {
	devices *service.DeviceService
	alerts  *service.AlertService
}

func NewStatusHandler(devices *service.DeviceService, alerts *service.AlertService) *StatusHandler {
	return &StatusHandler{devices: devices, alerts: alerts}
}

// Overview godoc
// GET /api/v1/status
// Returns a high-level summary of the infrastructure state.
func (h *StatusHandler) Overview(c *gin.Context) {
	all, err := h.devices.List(repository.DeviceFilter{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	counts := map[models.DeviceStatus]int{
		models.DeviceStatusOnline:  0,
		models.DeviceStatusOffline: 0,
		models.DeviceStatusUnknown: 0,
	}
	for _, d := range all {
		counts[d.Status]++
	}

	activeAlerts, _ := h.alerts.List(repository.AlertFilter{Status: models.AlertStatusActive, Limit: 1000})
	criticalCount := 0
	for _, a := range activeAlerts {
		if a.Severity == models.SeverityCritical {
			criticalCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"devices": gin.H{
			"total":   len(all),
			"online":  counts[models.DeviceStatusOnline],
			"offline": counts[models.DeviceStatusOffline],
			"unknown": counts[models.DeviceStatusUnknown],
		},
		"alerts": gin.H{
			"active":   len(activeAlerts),
			"critical": criticalCount,
		},
	})
}
