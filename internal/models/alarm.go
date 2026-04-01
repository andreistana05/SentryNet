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
