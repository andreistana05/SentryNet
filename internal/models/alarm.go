package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TicketStatus string
type TicketPriority string

const (
	StatusOpen       TicketStatus = "Open"
	StatusInProgress TicketStatus = "In Progress"
	StatusClosed     TicketStatus = "Closed"
)

const (
	PriorityHigh   TicketPriority = "High"
	PriorityMedium TicketPriority = "Medium"
	PriorityLow    TicketPriority = "Low"
)

// Alarm represents a single alarm event from a monitored device.
// When the same alarm repeats, an Incident is created.
type Alarm struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey"                        json:"id"`
	Alarm            string         `gorm:"not null;size:255"                           json:"alarm"`
	Hyperlink        string         `gorm:"size:500"                                    json:"hyperlink"`
	Status           TicketStatus   `gorm:"type:varchar(20);not null;default:'Open'"    json:"status"`
	SubmitDate       time.Time      `gorm:"not null;autoCreateTime"                     json:"submit_date"`
	LastModifiedDate time.Time      `gorm:"not null;autoUpdateTime"                     json:"last_modified_date"`
	CloseDate        *time.Time     `                                                   json:"close_date,omitempty"`
	Priority         TicketPriority `gorm:"type:varchar(10);not null"                   json:"priority"`
	AssignedGroup    string         `gorm:"size:255"                                    json:"assigned_group"`
	AssignedPerson   string         `gorm:"size:255"                                    json:"assigned_person"`
}

func (a *Alarm) BeforeCreate(_ *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// Incident is created when an alarm repeats itself, grouping related alarm occurrences.
type Incident struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey"                        json:"id"`
	IncidentNumber   string         `gorm:"not null;size:20;uniqueIndex"                json:"incident_number"`
	AlarmID          *uuid.UUID     `gorm:"type:uuid;index"                             json:"alarm_id,omitempty"`
	SourceAlarm      *Alarm         `gorm:"foreignKey:AlarmID"                          json:"source_alarm,omitempty"`
	Hyperlink        string         `gorm:"size:500"                                    json:"hyperlink"`
	Description      string         `gorm:"not null;size:1000"                          json:"description"`
	Status           TicketStatus   `gorm:"type:varchar(20);not null;default:'Open'"    json:"status"`
	SubmitDate       time.Time      `gorm:"not null;autoCreateTime"                     json:"submit_date"`
	LastModifiedDate time.Time      `gorm:"not null;autoUpdateTime"                     json:"last_modified_date"`
	CloseDate        *time.Time     `                                                   json:"close_date,omitempty"`
	Priority         TicketPriority `gorm:"type:varchar(10);not null"                   json:"priority"`
	AssignedGroup    string         `gorm:"size:255"                                    json:"assigned_group"`
	AssignedPerson   string         `gorm:"size:255"                                    json:"assigned_person"`
}

func (i *Incident) BeforeCreate(_ *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// EventType describes what happened in a TicketUpdate entry.
type EventType string

const (
	EventCreated         EventType = "created"
	EventEscalated       EventType = "escalated"
	EventStatusChanged   EventType = "status_changed"
	EventIncidentCreated EventType = "incident_created"
	EventClosed          EventType = "closed"
)

// Ticket is created automatically when an alarm fires and acts as its living document.
// All state changes are recorded in the Updates audit log.
type Ticket struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey"                        json:"id"`
	TicketNumber     string         `gorm:"not null;size:20;uniqueIndex"                json:"ticket_number"`
	AlarmID          uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex"              json:"alarm_id"`
	SourceAlarm      *Alarm         `gorm:"foreignKey:AlarmID"                          json:"source_alarm,omitempty"`
	Title            string         `gorm:"not null;size:255"                           json:"title"`
	Status           TicketStatus   `gorm:"type:varchar(20);not null;default:'Open'"    json:"status"`
	Priority         TicketPriority `gorm:"type:varchar(10);not null"                   json:"priority"`
	AssignedGroup    string         `gorm:"size:255"                                    json:"assigned_group"`
	AssignedPerson   string         `gorm:"size:255"                                    json:"assigned_person"`
	SubmitDate       time.Time      `gorm:"not null;autoCreateTime"                     json:"submit_date"`
	LastModifiedDate time.Time      `gorm:"not null;autoUpdateTime"                     json:"last_modified_date"`
	CloseDate        *time.Time     `                                                   json:"close_date,omitempty"`
	Updates          []TicketUpdate `gorm:"foreignKey:TicketID;constraint:OnDelete:CASCADE" json:"updates,omitempty"`
}

func (t *Ticket) BeforeCreate(_ *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

// TicketUpdate is an append-only audit entry recording every change to a Ticket.
type TicketUpdate struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"             json:"id"`
	TicketID    uuid.UUID `gorm:"type:uuid;not null;index"          json:"ticket_id"`
	EventType   EventType `gorm:"type:varchar(30);not null"         json:"event_type"`
	Description string    `gorm:"not null;size:500"                 json:"description"`
	Timestamp   time.Time `gorm:"not null;autoCreateTime"           json:"timestamp"`
}

func (u *TicketUpdate) BeforeCreate(_ *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
