package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/service"
)

// GroupHandler exposes endpoints for groups, employees, and ticket worker assignments.
type GroupHandler struct {
	svc *service.GroupService
}

func NewGroupHandler(svc *service.GroupService) *GroupHandler {
	return &GroupHandler{svc: svc}
}

// ---- Groups ----

// ListGroups godoc
// GET /api/v1/groups
func (h *GroupHandler) ListGroups(c *gin.Context) {
	groups, err := h.svc.ListGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": groups, "count": len(groups)})
}

// GetGroup godoc
// GET /api/v1/groups/:id
func (h *GroupHandler) GetGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	group, err := h.svc.GetGroup(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, group)
}

// CreateGroup godoc
// POST /api/v1/groups
func (h *GroupHandler) CreateGroup(c *gin.Context) {
	var body struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	group, err := h.svc.CreateGroup(body.Name, body.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, group)
}

// UpdateGroup godoc
// PUT /api/v1/groups/:id
func (h *GroupHandler) UpdateGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	var body struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	group, err := h.svc.UpdateGroup(id, body.Name, body.Description)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, group)
}

// DeleteGroup godoc
// DELETE /api/v1/groups/:id
func (h *GroupHandler) DeleteGroup(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group id"})
		return
	}
	if err := h.svc.DeleteGroup(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Employees ----

// ListEmployees godoc
// GET /api/v1/employees?group_id=&search=
func (h *GroupHandler) ListEmployees(c *gin.Context) {
	filter := repository.EmployeeFilter{Search: c.Query("search")}
	if gid := c.Query("group_id"); gid != "" {
		if id, err := uuid.Parse(gid); err == nil {
			filter.GroupID = &id
		}
	}
	employees, err := h.svc.ListEmployees(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": employees, "count": len(employees)})
}

// GetEmployee godoc
// GET /api/v1/employees/:id
func (h *GroupHandler) GetEmployee(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid employee id"})
		return
	}
	emp, err := h.svc.GetEmployee(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, emp)
}

// CreateEmployee godoc
// POST /api/v1/employees
func (h *GroupHandler) CreateEmployee(c *gin.Context) {
	var body struct {
		GroupID uuid.UUID `json:"group_id" binding:"required"`
		Name    string    `json:"name"     binding:"required"`
		Email   string    `json:"email"    binding:"required"`
		Role    string    `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	emp, err := h.svc.CreateEmployee(body.GroupID, body.Name, body.Email, body.Role)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, emp)
}

// UpdateEmployee godoc
// PUT /api/v1/employees/:id
func (h *GroupHandler) UpdateEmployee(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid employee id"})
		return
	}
	var body struct {
		GroupID uuid.UUID `json:"group_id" binding:"required"`
		Name    string    `json:"name"     binding:"required"`
		Email   string    `json:"email"    binding:"required"`
		Role    string    `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	emp, err := h.svc.UpdateEmployee(id, body.GroupID, body.Name, body.Email, body.Role)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, emp)
}

// DeleteEmployee godoc
// DELETE /api/v1/employees/:id
func (h *GroupHandler) DeleteEmployee(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid employee id"})
		return
	}
	if err := h.svc.DeleteEmployee(id); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Ticket Workers ----

// GetTicketWorkers godoc
// GET /api/v1/tickets/:id/workers
func (h *GroupHandler) GetTicketWorkers(c *gin.Context) {
	ticketID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return
	}
	workers, err := h.svc.GetTicketWorkers(ticketID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": workers, "count": len(workers)})
}

// AssignTicketWorker godoc
// POST /api/v1/tickets/:id/workers
func (h *GroupHandler) AssignTicketWorker(c *gin.Context) {
	ticketID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return
	}
	var body struct {
		EmployeeID uuid.UUID `json:"employee_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.AssignToTicket(ticketID, body.EmployeeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// UnassignTicketWorker godoc
// DELETE /api/v1/tickets/:id/workers/:employeeId
func (h *GroupHandler) UnassignTicketWorker(c *gin.Context) {
	ticketID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return
	}
	employeeID, err := uuid.Parse(c.Param("employeeId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid employee id"})
		return
	}
	if err := h.svc.UnassignFromTicket(ticketID, employeeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
