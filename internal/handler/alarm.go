// alarm.go exposes HTTP endpoints for the four ITIL entity types (alarms,
// incidents, problems, tickets) that form the escalation chain.
// All routes are registered under /api/v1 by the router package.
package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sentrynet/backend/internal/middleware"
	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/service"
)

// AlarmHandler exposes endpoints for alarms, incidents, problems, and tickets.
// All four entity types share this handler because they form a single escalation
// chain: alarm → incident → problem, each owning a ticket.
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
		Search:   c.Query("search"),
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
// GET /api/v1/alarms/:id  (accepts UUID or alarm number e.g. ALM0001)
func (h *AlarmHandler) GetAlarm(c *gin.Context) {
	raw := c.Param("id")
	if id, err := uuid.Parse(raw); err == nil {
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
		return
	}
	// Try human-readable number (e.g. ALM0001)
	alarm, err := h.svc.GetByNumber(raw)
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
		Search:   c.Query("search"),
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
// GET /api/v1/incidents/:id  (accepts UUID or incident number e.g. INC0001)
func (h *AlarmHandler) GetIncident(c *gin.Context) {
	raw := c.Param("id")
	if id, err := uuid.Parse(raw); err == nil {
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
		return
	}
	incident, err := h.svc.GetIncidentByNumber(raw)
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

// ListProblems godoc
// GET /api/v1/problems
func (h *AlarmHandler) ListProblems(c *gin.Context) {
	filter := repository.ProblemFilter{
		Status:    models.TicketStatus(c.Query("status")),
		Priority:  models.TicketPriority(c.Query("priority")),
		AlarmName: c.Query("alarm_name"),
		Search:    c.Query("search"),
		Limit:     100,
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

	problems, err := h.svc.ListProblems(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": problems, "count": len(problems)})
}

// GetProblem godoc
// GET /api/v1/problems/:id  (accepts UUID or problem number e.g. PRB0001)
func (h *AlarmHandler) GetProblem(c *gin.Context) {
	raw := c.Param("id")
	if id, err := uuid.Parse(raw); err == nil {
		problem, err := h.svc.GetProblem(id)
		if err != nil {
			if errors.Is(err, service.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "problem not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, problem)
		return
	}
	problem, err := h.svc.GetProblemByNumber(raw)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "problem not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, problem)
}

// CloseProblem godoc
// PUT /api/v1/problems/:id/close
func (h *AlarmHandler) CloseProblem(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid problem ID"})
		return
	}

	if err := h.svc.CloseProblem(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "problem not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "problem closed"})
}

// ListTickets godoc
// GET /api/v1/tickets
func (h *AlarmHandler) ListTickets(c *gin.Context) {
	filter := repository.TicketFilter{
		Status:   models.TicketStatus(c.Query("status")),
		Priority: models.TicketPriority(c.Query("priority")),
		Search:   c.Query("search"),
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

// UpdateTicketStatus godoc
// PATCH /api/v1/tickets/:id/status
func (h *AlarmHandler) UpdateTicketStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ticket, err := h.svc.UpdateTicketStatus(id, models.TicketStatus(req.Status))
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
			return
		}
		if err.Error() == "invalid status value" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ticket)
}

// GetTicketNotes godoc
// GET /api/v1/tickets/:id/notes
func (h *AlarmHandler) GetTicketNotes(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return
	}
	notes, err := h.svc.GetTicketNotes(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": notes, "count": len(notes)})
}

// CreateTicketNote godoc
// POST /api/v1/tickets/:id/notes
func (h *AlarmHandler) CreateTicketNote(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return
	}

	var req struct {
		Body string `json:"body" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	claims := middleware.GetClaims(c)
	authorName := "Operator"
	if claims != nil && claims.Username != "" {
		authorName = claims.Username
	}

	note, err := h.svc.CreateTicketNote(id, req.Body, authorName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, note)
}

// GetTicket godoc
// GET /api/v1/tickets/:id  (accepts UUID or ticket number e.g. TKT0001)
func (h *AlarmHandler) GetTicket(c *gin.Context) {
	raw := c.Param("id")
	if id, err := uuid.Parse(raw); err == nil {
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
		return
	}
	ticket, err := h.svc.GetTicketByNumber(raw)
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
