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
	Types  []models.MetricType
	From   time.Time
	To     time.Time
	Limit  int
}

// MetricRepository defines operations on metrics.
type MetricRepository interface {
	Create(metric *models.Metric) error
	CreateBatch(metrics []models.Metric) error
	FindByDevice(deviceID uuid.UUID, filter MetricFilter) ([]models.Metric, error)
	FindLatestByDevice(deviceID uuid.UUID) ([]models.Metric, error)
	FindAll(filter MetricFilter) ([]models.Metric, error)
}

// AlertFilter holds optional filters for querying alerts.
type AlertFilter struct {
	DeviceID *uuid.UUID
	Severity models.AlertSeverity
	Status   models.AlertStatus
	Limit    int
	Offset   int
}

// AlertRepository defines operations on alerts.
type AlertRepository interface {
	Create(alert *models.Alert) error
	FindAll(filter AlertFilter) ([]models.Alert, error)
	FindByID(id uuid.UUID) (*models.Alert, error)
	FindByDevice(deviceID uuid.UUID) ([]models.Alert, error)
	Update(alert *models.Alert) error
	FindActiveByDeviceAndRule(deviceID, ruleID uuid.UUID) (*models.Alert, error)
	FindActiveByDevice(deviceID uuid.UUID) ([]models.Alert, error)
	CountByStatus(status models.AlertStatus) (int64, error)
}

// AlertRuleRepository defines operations on alert rules.
type AlertRuleRepository interface {
	Create(rule *models.AlertRule) error
	FindAll() ([]models.AlertRule, error)
	FindByID(id uuid.UUID) (*models.AlertRule, error)
	FindApplicable(deviceID uuid.UUID, deviceType models.DeviceType) ([]models.AlertRule, error)
	Update(rule *models.AlertRule) error
	Delete(id uuid.UUID) error
}
