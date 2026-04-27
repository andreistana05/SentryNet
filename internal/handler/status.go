package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/service"
)

// StatusHandler serves the dashboard overview endpoint with aggregate health counts.
type StatusHandler struct {
	devices *service.DeviceService
	alarms  *service.AlarmService
}

func NewStatusHandler(devices *service.DeviceService, alarms *service.AlarmService) *StatusHandler {
	return &StatusHandler{devices: devices, alarms: alarms}
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

	openAlarms, _ := h.alarms.List(repository.AlarmFilter{Status: models.StatusOpen, Limit: 1000})
	highPriorityCount := 0
	for _, a := range openAlarms {
		if a.Priority == models.PriorityHigh {
			highPriorityCount++
		}
	}

	openIncidents, _ := h.alarms.ListIncidents(repository.IncidentFilter{Status: models.StatusOpen, Limit: 1000})
	openTickets, _ := h.alarms.ListTickets(repository.TicketFilter{Status: models.StatusOpen, Limit: 1000})
	openProblems, _ := h.alarms.ListProblems(repository.ProblemFilter{Status: models.StatusOpen, Limit: 1000})

	c.JSON(http.StatusOK, gin.H{
		"devices": gin.H{
			"total":   len(all),
			"online":  counts[models.DeviceStatusOnline],
			"offline": counts[models.DeviceStatusOffline],
			"unknown": counts[models.DeviceStatusUnknown],
		},
		"alarms": gin.H{
			"open":          len(openAlarms),
			"high_priority": highPriorityCount,
		},
		"incidents": gin.H{
			"open": len(openIncidents),
		},
		"tickets": gin.H{
			"open": len(openTickets),
		},
		"problems": gin.H{
			"open": len(openProblems),
		},
	})
}
