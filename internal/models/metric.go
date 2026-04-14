package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MetricType string

const (
	MetricCPUUsage       MetricType = "cpu_usage"
	MetricRAMUsage       MetricType = "ram_usage"
	MetricDiskUsage      MetricType = "disk_usage"
	MetricNetworkIn      MetricType = "network_in"
	MetricNetworkOut     MetricType = "network_out"
	MetricLatency        MetricType = "latency"
	MetricUptime         MetricType = "uptime"
	MetricTonerLevel     MetricType = "toner_level"
	MetricPortStatus     MetricType = "port_status"
	MetricTemperature    MetricType = "temperature"
	MetricPacketLoss     MetricType = "packet_loss"
	MetricNetworkErrors  MetricType = "network_errors"
)

type Metric struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	DeviceID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"device_id"`
	Device    *Device    `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
	Type      MetricType `gorm:"type:varchar(50);not null;index" json:"type"`
	Value     float64    `gorm:"not null" json:"value"`
	Unit      string     `gorm:"size:20" json:"unit"`
	Timestamp time.Time  `gorm:"not null;index" json:"timestamp"`
}

func (m *Metric) BeforeCreate(_ *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
