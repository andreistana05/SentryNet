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

	// Alarms and incidents are "active" when Open or In Progress.
	activeAlarms, _ := h.alarms.List(repository.AlarmFilter{Limit: 1000})
	activeAlarmCount := 0
	highPriorityCount := 0
	for _, a := range activeAlarms {
		if a.Status != models.StatusClosed {
			activeAlarmCount++
			if a.Priority == models.PriorityHigh {
				highPriorityCount++
			}
		}
	}

	allIncidents, _ := h.alarms.ListIncidents(repository.IncidentFilter{Limit: 1000})
	activeIncidentCount := 0
	for _, i := range allIncidents {
		if i.Status != models.StatusClosed {
			activeIncidentCount++
		}
	}

	// Tickets use different terminal statuses: "resolved" and "closed".
	allTickets, _ := h.alarms.ListTickets(repository.TicketFilter{Limit: 1000})
	activeTicketCount := 0
	for _, t := range allTickets {
		if t.Status != models.StatusResolved && t.Status != models.StatusClosedTicket {
			activeTicketCount++
		}
	}

	allProblems, _ := h.alarms.ListProblems(repository.ProblemFilter{Limit: 1000})
	activeProblemCount := 0
	for _, p := range allProblems {
		if p.Status != models.StatusClosed && p.Status != models.StatusClosedTicket {
			activeProblemCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"devices": gin.H{
			"total":   len(all),
			"online":  counts[models.DeviceStatusOnline],
			"offline": counts[models.DeviceStatusOffline],
			"unknown": counts[models.DeviceStatusUnknown],
		},
		"alarms": gin.H{
			"open":          activeAlarmCount,
			"high_priority": highPriorityCount,
		},
		"incidents": gin.H{
			"open": activeIncidentCount,
		},
		"tickets": gin.H{
			"open": activeTicketCount,
		},
		"problems": gin.H{
			"open": activeProblemCount,
		},
	})
}
