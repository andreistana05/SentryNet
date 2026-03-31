package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DeviceType string
type DeviceStatus string

const (
	DeviceTypeServer      DeviceType = "server"
	DeviceTypeRouter      DeviceType = "router"
	DeviceTypeSwitch      DeviceType = "switch"
	DeviceTypePrinter     DeviceType = "printer"
	DeviceTypeWorkstation DeviceType = "workstation"
)

const (
	DeviceStatusOnline  DeviceStatus = "online"
	DeviceStatusOffline DeviceStatus = "offline"
	DeviceStatusUnknown DeviceStatus = "unknown"
)

type Device struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string       `gorm:"not null;size:255" json:"name"`
	Type        DeviceType   `gorm:"type:varchar(20);not null" json:"type"`
	Hostname    string       `gorm:"size:255;index" json:"hostname"`
	IPAddress   string       `gorm:"size:45;uniqueIndex" json:"ip_address"`
	Status      DeviceStatus `gorm:"type:varchar(20);not null;default:'unknown'" json:"status"`
	Description string       `gorm:"size:500" json:"description,omitempty"`
	Location    string       `gorm:"size:255" json:"location,omitempty"`
	LastSeen    *time.Time   `json:"last_seen,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

func (d *Device) BeforeCreate(_ *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}
