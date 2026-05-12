package models

import (
	"time"

	"github.com/google/uuid"
)

type MetricAggregate struct {
	ID          uuid.UUID  `json:"id"`
	DeviceID    uuid.UUID  `json:"device_id"`
	Type        MetricType `json:"type"`
	AvgValue    float64    `json:"avg_value"`
	MinValue    float64    `json:"min_value"`
	MaxValue    float64    `json:"max_value"`
	SampleCount int        `json:"sample_count"`
	Unit        string     `json:"unit"`
	PeriodStart time.Time  `json:"period_start"`
	PeriodEnd   time.Time  `json:"period_end"`
	CreatedAt   time.Time  `json:"created_at"`
}
