package models

import (
	"time"

	"github.com/google/uuid"
)

// Group represents a team within the organisation (e.g. "Network Team").
type Group struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Employee is a person who belongs to a Group and can be assigned to tickets.
type Employee struct {
	ID        uuid.UUID `json:"id"`
	GroupID   uuid.UUID `json:"group_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Group     *Group    `json:"group,omitempty"`
}

// TicketWorker records which Employee is working on a given Ticket (many-to-many).
type TicketWorker struct {
	TicketID   uuid.UUID `json:"ticket_id"`
	EmployeeID uuid.UUID `json:"employee_id"`
	AssignedAt time.Time `json:"assigned_at"`
	Employee   *Employee `json:"employee,omitempty"`
}
