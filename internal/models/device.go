package models

import (
	"time"

	"github.com/google/uuid"
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
	ID          uuid.UUID    `json:"id"`
	Name        string       `json:"name"`
	Type        DeviceType   `json:"type"`
	Hostname    string       `json:"hostname"`
	IPAddress   string       `json:"ip_address"`
	Status      DeviceStatus `json:"status"`
	Description string       `json:"description,omitempty"`
	Location    string       `json:"location,omitempty"`
	LastSeen    *time.Time   `json:"last_seen,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}
