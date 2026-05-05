package models

import (
	"time"

	"github.com/google/uuid"
)

type MetricType string

const (
	MetricCPUUsage      MetricType = "cpu_usage"
	MetricRAMUsage      MetricType = "ram_usage"
	MetricDiskUsage     MetricType = "disk_usage"
	MetricNetworkIn     MetricType = "network_in"
	MetricNetworkOut    MetricType = "network_out"
	MetricLatency       MetricType = "latency"
	MetricUptime        MetricType = "uptime"
	MetricTonerLevel    MetricType = "toner_level"
	MetricPortStatus    MetricType = "port_status"
	MetricTemperature   MetricType = "temperature"
	MetricPacketLoss    MetricType = "packet_loss"
	MetricNetworkErrors MetricType = "network_errors"
)

type Metric struct {
	ID        uuid.UUID  `json:"id"`
	DeviceID  uuid.UUID  `json:"device_id"`
	Type      MetricType `json:"type"`
	Value     float64    `json:"value"`
	Unit      string     `json:"unit"`
	Timestamp time.Time  `json:"timestamp"`
}
