// Package repository defines data-access interfaces and their PostgreSQL
// implementations. Every filter struct treats the zero value of each field as
// "no constraint" — unset fields are omitted from the generated WHERE clause.
package repository

import (
	"time"

	"github.com/google/uuid"
	"sentrynet/backend/internal/models"
)

// UserRepository defines operations on users.
type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id uuid.UUID) (*models.User, error)
}

// DeviceFilter holds optional filters for listing devices.
type DeviceFilter struct {
	Type   models.DeviceType
	Status models.DeviceStatus
	Search string // matches hostname or IP
	Since  *time.Time
}

// DeviceRepository defines operations on devices.
type DeviceRepository interface {
	Create(device *models.Device) error
	FindAll(filter DeviceFilter) ([]models.Device, error)
	FindByID(id uuid.UUID) (*models.Device, error)
	FindByIP(ip string) (*models.Device, error)
	FindByHostname(hostname string) (*models.Device, error)
	Update(device *models.Device) error
	Delete(id uuid.UUID) error
	UpdateStatus(id uuid.UUID, status models.DeviceStatus, lastSeen time.Time) error
	FindStale(before time.Time) ([]models.Device, error)
}

// MetricFilter holds optional filters for querying metrics.
type MetricFilter struct {
	Types []models.MetricType
	From  time.Time
	To    time.Time
	Limit int
}

// MetricRepository defines operations on metrics.
type MetricRepository interface {
	Create(metric *models.Metric) error
	CreateBatch(metrics []models.Metric) error
	FindByDevice(deviceID uuid.UUID, filter MetricFilter) ([]models.Metric, error)
	FindLatestByDevice(deviceID uuid.UUID) ([]models.Metric, error)
	FindAll(filter MetricFilter) ([]models.Metric, error)
}

// AlarmFilter holds optional filters for querying alarms.
type AlarmFilter struct {
	Status   models.TicketStatus
	Priority models.TicketPriority
	Search   string // matches alarm_number
	Limit    int
	Offset   int
}

// AlarmRepository defines operations on alarms.
type AlarmRepository interface {
	Create(alarm *models.Alarm) error
	FindAll(filter AlarmFilter) ([]models.Alarm, error)
	FindByID(id uuid.UUID) (*models.Alarm, error)
	FindByNumber(number string) (*models.Alarm, error)
	Update(alarm *models.Alarm) error
	Delete(id uuid.UUID) error
	CountByStatus(status models.TicketStatus) (int64, error)
	NextAlarmNumber() (string, error)
}

// IncidentFilter holds optional filters for querying incidents.
type IncidentFilter struct {
	AlarmID  *uuid.UUID
	Status   models.TicketStatus
	Priority models.TicketPriority
	Search   string // matches incident_number
	Limit    int
	Offset   int
}

// IncidentRepository defines operations on incidents.
type IncidentRepository interface {
	Create(incident *models.Incident) error
	FindAll(filter IncidentFilter) ([]models.Incident, error)
	FindByID(id uuid.UUID) (*models.Incident, error)
	FindByNumber(number string) (*models.Incident, error)
	FindByAlarm(alarmID uuid.UUID) ([]models.Incident, error)
	Update(incident *models.Incident) error
	Delete(id uuid.UUID) error
	NextIncidentNumber() (string, error)
}

// ProblemFilter holds optional filters for querying problems.
type ProblemFilter struct {
	Status    models.TicketStatus
	Priority  models.TicketPriority
	AlarmName string
	Search    string // matches problem_number
	Limit     int
	Offset    int
}

// ProblemRepository defines operations on problems.
type ProblemRepository interface {
	Create(problem *models.Problem) error
	FindAll(filter ProblemFilter) ([]models.Problem, error)
	FindByID(id uuid.UUID) (*models.Problem, error)
	FindByNumber(number string) (*models.Problem, error)
	FindOpenByAlarmName(alarmName string) (*models.Problem, error)
	Update(problem *models.Problem) error
	Delete(id uuid.UUID) error
	NextProblemNumber() (string, error)
}

// TicketFilter holds optional filters for querying tickets.
type TicketFilter struct {
	IncidentID *uuid.UUID
	Status     models.TicketStatus
	Priority   models.TicketPriority
	Search     string // matches ticket_number
	Limit      int
	Offset     int
}

// TicketRepository defines operations on tickets and their audit updates.
type TicketRepository interface {
	Create(ticket *models.Ticket) error
	FindAll(filter TicketFilter) ([]models.Ticket, error)
	FindByID(id uuid.UUID) (*models.Ticket, error)
	FindByNumber(number string) (*models.Ticket, error)
	FindByIncidentID(incidentID uuid.UUID) (*models.Ticket, error)
	Update(ticket *models.Ticket) error
	AddUpdate(update *models.TicketUpdate) error
	NextTicketNumber() (string, error)
	FindNotesByTicketID(ticketID uuid.UUID) ([]models.TicketNote, error)
	CreateNote(note *models.TicketNote) error
}
