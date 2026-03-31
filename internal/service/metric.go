package service

import (
	"time"

	"github.com/google/uuid"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
)

type MetricService struct {
	metrics repository.MetricRepository
	alerts  *AlertService
}

func newMetricService(metrics repository.MetricRepository, alerts *AlertService) *MetricService {
	return &MetricService{metrics: metrics, alerts: alerts}
}

// IngestMetricItem represents a single metric in an ingest payload.
type IngestMetricItem struct {
	Type  models.MetricType `json:"type" binding:"required"`
	Value float64           `json:"value"`
	Unit  string            `json:"unit"`
}

// IngestRequest is the payload sent by the agent or network monitor.
type IngestRequest struct {
	DeviceID  *uuid.UUID         `json:"device_id"`
	Hostname  string             `json:"hostname"`
	IPAddress string             `json:"ip_address" binding:"required"`
	Type      models.DeviceType  `json:"device_type"`
	Timestamp *time.Time         `json:"timestamp"`
	Metrics   []IngestMetricItem `json:"metrics" binding:"required,min=1"`
}

// HeartbeatRequest is the payload sent by the agent to signal the device is alive.
type HeartbeatRequest struct {
	DeviceID  *uuid.UUID        `json:"device_id"`
	Hostname  string            `json:"hostname"`
	IPAddress string            `json:"ip_address" binding:"required"`
	Type      models.DeviceType `json:"device_type"`
}

func (s *MetricService) Ingest(deviceID uuid.UUID, deviceType models.DeviceType, items []IngestMetricItem, ts time.Time) error {
	metrics := make([]models.Metric, len(items))
	for i, item := range items {
		metrics[i] = models.Metric{
			DeviceID:  deviceID,
			Type:      item.Type,
			Value:     item.Value,
			Unit:      item.Unit,
			Timestamp: ts,
		}
	}

	if err := s.metrics.CreateBatch(metrics); err != nil {
		return err
	}

	// Evaluate alert rules against the newly ingested metrics.
	go s.alerts.EvaluateMetrics(deviceID, deviceType, items)

	return nil
}

func (s *MetricService) GetByDevice(deviceID uuid.UUID, filter repository.MetricFilter) ([]models.Metric, error) {
	return s.metrics.FindByDevice(deviceID, filter)
}

func (s *MetricService) GetLatestByDevice(deviceID uuid.UUID) ([]models.Metric, error) {
	return s.metrics.FindLatestByDevice(deviceID)
}

func (s *MetricService) GetAll(filter repository.MetricFilter) ([]models.Metric, error) {
	return s.metrics.FindAll(filter)
}
