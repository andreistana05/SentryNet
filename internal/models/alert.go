package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AlertSeverity string
type AlertStatus string
type AlertOperator string

const (
	SeverityCritical AlertSeverity = "critical"
	SeverityWarning  AlertSeverity = "warning"
	SeverityInfo     AlertSeverity = "info"
)

const (
	AlertStatusActive       AlertStatus = "active"
	AlertStatusAcknowledged AlertStatus = "acknowledged"
	AlertStatusResolved     AlertStatus = "resolved"
)

const (
	OperatorGT  AlertOperator = "gt"
	OperatorLT  AlertOperator = "lt"
	OperatorGTE AlertOperator = "gte"
	OperatorLTE AlertOperator = "lte"
	OperatorEQ  AlertOperator = "eq"
)

// AlertRule defines a threshold condition that triggers an alert.
// If DeviceID is set, the rule applies to that specific device.
// If DeviceID is nil and DeviceType is set, it applies to all devices of that type.
// If both are nil, the rule applies to all devices.
type AlertRule struct {
	ID         uuid.UUID     `gorm:"type:uuid;primaryKey" json:"id"`
	Name       string        `gorm:"not null;size:255" json:"name"`
	DeviceID   *uuid.UUID    `gorm:"type:uuid;index" json:"device_id,omitempty"`
	Device     *Device       `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
	DeviceType *DeviceType   `gorm:"type:varchar(20)" json:"device_type,omitempty"`
	MetricType MetricType    `gorm:"type:varchar(50);not null" json:"metric_type"`
	Operator   AlertOperator `gorm:"type:varchar(10);not null" json:"operator"`
	Threshold  float64       `gorm:"not null" json:"threshold"`
	Severity   AlertSeverity `gorm:"type:varchar(20);not null" json:"severity"`
	Enabled    bool          `gorm:"not null;default:true" json:"enabled"`
	CreatedAt  time.Time     `json:"created_at"`
	UpdatedAt  time.Time     `json:"updated_at"`
}

func (ar *AlertRule) BeforeCreate(_ *gorm.DB) error {
	if ar.ID == uuid.Nil {
		ar.ID = uuid.New()
	}
	return nil
}

// Evaluate returns true if the given value violates this rule's threshold.
func (ar *AlertRule) Evaluate(value float64) bool {
	switch ar.Operator {
	case OperatorGT:
		return value > ar.Threshold
	case OperatorLT:
		return value < ar.Threshold
	case OperatorGTE:
		return value >= ar.Threshold
	case OperatorLTE:
		return value <= ar.Threshold
	case OperatorEQ:
		return value == ar.Threshold
	}
	return false
}

type Alert struct {
	ID             uuid.UUID     `gorm:"type:uuid;primaryKey" json:"id"`
	DeviceID       uuid.UUID     `gorm:"type:uuid;not null;index" json:"device_id"`
	Device         *Device       `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
	RuleID         *uuid.UUID    `gorm:"type:uuid;index" json:"rule_id,omitempty"`
	Rule           *AlertRule    `gorm:"foreignKey:RuleID" json:"rule,omitempty"`
	Severity       AlertSeverity `gorm:"type:varchar(20);not null" json:"severity"`
	Status         AlertStatus   `gorm:"type:varchar(20);not null;default:'active'" json:"status"`
	Title          string        `gorm:"not null;size:255" json:"title"`
	Message        string        `gorm:"not null;size:1000" json:"message"`
	CreatedAt      time.Time     `json:"created_at"`
	AcknowledgedAt *time.Time    `json:"acknowledged_at,omitempty"`
	ResolvedAt     *time.Time    `json:"resolved_at,omitempty"`
}

func (a *Alert) BeforeCreate(_ *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
