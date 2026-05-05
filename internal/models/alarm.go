// Package models defines GORM database models and their associated constants.
// Every model implements a BeforeCreate hook that auto-assigns a UUID primary
// key when one has not been explicitly provided by the caller.
package models

import (
	"time"

	"github.com/google/uuid"
)

// TicketStatus tracks the lifecycle state of an alarm, incident, problem, or ticket.
// The extended values (assigned, in-progress, awaiting-vendor, …) are used by the
// ticket workflow; alarms and incidents only use Open / In Progress / Closed.
type TicketStatus string

// TicketPriority indicates the severity of an alert entity.
type TicketPriority string

const (
	StatusOpen              TicketStatus = "Open"
	StatusInProgress        TicketStatus = "In Progress"
	StatusClosed            TicketStatus = "Closed"
	StatusAssigned          TicketStatus = "assigned"
	StatusInProgressTicket  TicketStatus = "in-progress"
	StatusAwaitingVendor    TicketStatus = "awaiting-vendor"
	StatusMitigating        TicketStatus = "mitigating"
	StatusRootCauseAnalysis TicketStatus = "root-cause-analysis"
	StatusResolved          TicketStatus = "resolved"
	StatusClosedTicket      TicketStatus = "closed"
)

const (
	PriorityHigh   TicketPriority = "High"
	PriorityMedium TicketPriority = "Medium"
	PriorityLow    TicketPriority = "Low"
)

// Alarm represents a single alarm event from a monitored device.
// When a new unique alarm fires, an Incident is created. Duplicate active alarms are escalated.
type Alarm struct {
	ID               uuid.UUID      `json:"id"`
	AlarmNumber      string         `json:"alarm_number"`
	Alarm            string         `json:"alarm"`
	Hyperlink        string         `json:"hyperlink"`
	Status           TicketStatus   `json:"status"`
	SubmitDate       time.Time      `json:"submit_date"`
	LastModifiedDate time.Time      `json:"last_modified_date"`
	CloseDate        *time.Time     `json:"close_date,omitempty"`
	Priority         TicketPriority `json:"priority"`
	AssignedGroup    string         `json:"assigned_group"`
	AssignedPerson   string         `json:"assigned_person"`
}

// Incident is created for every new unique alarm. It groups related occurrences
// and owns the Ticket that tracks resolution work.
type Incident struct {
	ID               uuid.UUID      `json:"id"`
	IncidentNumber   string         `json:"incident_number"`
	AlarmID          *uuid.UUID     `json:"alarm_id,omitempty"`
	Hyperlink        string         `json:"hyperlink"`
	Description      string         `json:"description"`
	Status           TicketStatus   `json:"status"`
	SubmitDate       time.Time      `json:"submit_date"`
	LastModifiedDate time.Time      `json:"last_modified_date"`
	CloseDate        *time.Time     `json:"close_date,omitempty"`
	Priority         TicketPriority `json:"priority"`
	AssignedGroup    string         `json:"assigned_group"`
	AssignedPerson   string         `json:"assigned_person"`
	SourceAlarm      *Alarm         `json:"source_alarm,omitempty"`
}


// Problem is created when the same alarm recurs after a previous incident has closed,
// indicating a systemic issue that requires root-cause investigation.
type Problem struct {
	ID               uuid.UUID      `json:"id"`
	ProblemNumber    string         `json:"problem_number"`
	AlarmName        string         `json:"alarm_name"`
	IncidentID       *uuid.UUID     `json:"incident_id,omitempty"`
	Hyperlink        string         `json:"hyperlink"`
	Description      string         `json:"description"`
	Status           TicketStatus   `json:"status"`
	SubmitDate       time.Time      `json:"submit_date"`
	LastModifiedDate time.Time      `json:"last_modified_date"`
	CloseDate        *time.Time     `json:"close_date,omitempty"`
	Priority         TicketPriority `json:"priority"`
	AssignedGroup    string         `json:"assigned_group"`
	AssignedPerson   string         `json:"assigned_person"`
	OccurrenceCount  int            `json:"occurrence_count"`
	SourceIncident   *Incident      `json:"source_incident,omitempty"`
}

// EventType describes what happened in a TicketUpdate entry.
type EventType string

const (
	EventCreated        EventType = "created"
	EventEscalated      EventType = "escalated"
	EventStatusChanged  EventType = "status_changed"
	EventProblemCreated EventType = "problem_created"
	EventClosed         EventType = "closed"
)

// Ticket is created automatically when an incident is raised and acts as its living document.
// All state changes are recorded in the Updates audit log.
type Ticket struct {
	ID               uuid.UUID      `json:"id"`
	TicketNumber     string         `json:"ticket_number"`
	IncidentID       uuid.UUID      `json:"incident_id"`
	Title            string         `json:"title"`
	Status           TicketStatus   `json:"status"`
	Priority         TicketPriority `json:"priority"`
	AssignedGroup    string         `json:"assigned_group"`
	AssignedPerson   string         `json:"assigned_person"`
	SubmitDate       time.Time      `json:"submit_date"`
	LastModifiedDate time.Time      `json:"last_modified_date"`
	CloseDate        *time.Time     `json:"close_date,omitempty"`
	SourceIncident   *Incident      `json:"source_incident,omitempty"`
}


// TicketUpdate is an append-only audit entry recording every change to a Ticket.
type TicketUpdate struct {
	ID          uuid.UUID `json:"id"`
	TicketID    uuid.UUID `json:"ticket_id"`
	EventType   EventType `json:"event_type"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
}


// TicketNote is a free-text comment left by an operator on a Ticket.
type TicketNote struct {
	ID         uuid.UUID `json:"id"`
	TicketID   uuid.UUID `json:"ticketId"`
	Body       string    `json:"body"`
	AuthorName string    `json:"authorName"`
	CreatedAt  time.Time `json:"createdAt"`
}