package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/service"
)

type AlarmHandler struct {
	svc *service.AlarmService
}

func NewAlarmHandler(svc *service.AlarmService) *AlarmHandler {
	return &AlarmHandler{svc: svc}
}

// ListAlarms godoc
// GET /api/v1/alarms
func (h *AlarmHandler) ListAlarms(c *gin.Context) {
	filter := repository.AlarmFilter{
		Status:   models.TicketStatus(c.Query("status")),
		Priority: models.TicketPriority(c.Query("priority")),
		Limit:    100,
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			filter.Limit = n
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if n, err := strconv.Atoi(offsetStr); err == nil && n >= 0 {
			filter.Offset = n
		}
	}

	alarms, err := h.svc.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": alarms, "count": len(alarms)})
}

// GetAlarm godoc
// GET /api/v1/alarms/:id
func (h *AlarmHandler) GetAlarm(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid alarm ID"})
		return
	}

	alarm, err := h.svc.Get(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "alarm not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, alarm)
}

// SetInProgress godoc
// PUT /api/v1/alarms/:id/in-progress
func (h *AlarmHandler) SetInProgress(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid alarm ID"})
		return
	}

	if err := h.svc.SetInProgress(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "alarm not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "alarm set to in progress"})
}

// CloseAlarm godoc
// PUT /api/v1/alarms/:id/close
func (h *AlarmHandler) CloseAlarm(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid alarm ID"})
		return
	}

	if err := h.svc.Close(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "alarm not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "alarm closed"})
}

// ListIncidents godoc
// GET /api/v1/incidents
func (h *AlarmHandler) ListIncidents(c *gin.Context) {
	filter := repository.IncidentFilter{
		Status:   models.TicketStatus(c.Query("status")),
		Priority: models.TicketPriority(c.Query("priority")),
		Limit:    100,
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			filter.Limit = n
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if n, err := strconv.Atoi(offsetStr); err == nil && n >= 0 {
			filter.Offset = n
		}
	}

	incidents, err := h.svc.ListIncidents(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": incidents, "count": len(incidents)})
}

// GetIncident godoc
// GET /api/v1/incidents/:id
func (h *AlarmHandler) GetIncident(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	incident, err := h.svc.GetIncident(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "incident not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, incident)
}

// CloseIncident godoc
// PUT /api/v1/incidents/:id/close
func (h *AlarmHandler) CloseIncident(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	if err := h.svc.CloseIncident(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "incident not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "incident closed"})
}

// ListTickets godoc
// GET /api/v1/tickets
func (h *AlarmHandler) ListTickets(c *gin.Context) {
	filter := repository.TicketFilter{
		Status:   models.TicketStatus(c.Query("status")),
		Priority: models.TicketPriority(c.Query("priority")),
		Limit:    100,
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			filter.Limit = n
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if n, err := strconv.Atoi(offsetStr); err == nil && n >= 0 {
			filter.Offset = n
		}
	}

	tickets, err := h.svc.ListTickets(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tickets, "count": len(tickets)})
}

// GetTicket godoc
// GET /api/v1/tickets/:id
func (h *AlarmHandler) GetTicket(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket ID"})
		return
	}

	ticket, err := h.svc.GetTicket(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ticket)
}
