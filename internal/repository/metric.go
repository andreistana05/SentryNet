// metric.go contains the PostgreSQL implementation of MetricRepository.
// Metrics are append-only time-series rows written by agent ingest and read
// by the dashboard's device detail panel and chart endpoints.
package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
)

type metricRepository struct {
	db *gorm.DB
}

func newMetricRepository(db *gorm.DB) MetricRepository {
	return &metricRepository{db: db}
}

// Create inserts a single metric row. Used by MetricService.Ingest when only
// one metric reading needs to be saved (not currently called — CreateBatch is
// preferred for all agent payloads).
func (r *metricRepository) Create(metric *models.Metric) error {
	return r.db.Create(metric).Error
}

// CreateBatch inserts multiple metrics in a single database round-trip.
// Called by MetricService.Ingest every time an agent or network monitor POSTs
// to /api/v1/ingest/metrics — all readings in the payload are saved together.
// Returns nil immediately when the slice is empty to avoid a no-op query.
func (r *metricRepository) CreateBatch(metrics []models.Metric) error {
	if len(metrics) == 0 {
		return nil
	}
	return r.db.Create(&metrics).Error
}

// FindByDevice returns all metrics for a device within an optional time range,
// ordered oldest-first so the frontend can plot them as a time-series chart.
// Called by MetricService.GetByDevice, which is triggered when the dashboard
// requests GET /api/v1/devices/:id/metrics?from=...&to=...
func (r *metricRepository) FindByDevice(deviceID uuid.UUID, filter MetricFilter) ([]models.Metric, error) {
	var metrics []models.Metric
	q := r.db.Where("device_id = ?", deviceID)
	q = applyMetricFilter(q, filter)

	if err := q.Order("timestamp ASC").Find(&metrics).Error; err != nil {
		return nil, err
	}
	return metrics, nil
}

// FindLatestByDevice returns the most recent metric for each type for the given device.
// Called by MetricService.GetLatestByDevice, which is triggered when the dashboard
// requests GET /api/v1/devices/:id/metrics (no time range) — used to show the
// current CPU, RAM, etc. readings on the device detail panel.
func (r *metricRepository) FindLatestByDevice(deviceID uuid.UUID) ([]models.Metric, error) {
	var metrics []models.Metric
	subQuery := r.db.Model(&models.Metric{}).
		Select("type, MAX(timestamp) as max_ts").
		Where("device_id = ?", deviceID).
		Group("type")

	err := r.db.Where("device_id = ? AND (type, timestamp) IN (?)", deviceID, subQuery).
		Find(&metrics).Error
	return metrics, err
}

// FindAll returns metrics across all devices, filtered by type and time range.
// Called by MetricService.GetAll — currently available for future use (e.g. a
// fleet-wide metrics overview endpoint).
func (r *metricRepository) FindAll(filter MetricFilter) ([]models.Metric, error) {
	var metrics []models.Metric
	q := r.db.Model(&models.Metric{})
	q = applyMetricFilter(q, filter)

	if err := q.Order("timestamp DESC").Find(&metrics).Error; err != nil {
		return nil, err
	}
	return metrics, nil
}

// applyMetricFilter chains WHERE clauses onto an existing query based on whichever
// fields in the filter are set. The query is not executed here — it runs only when
// .Find() or .First() is called by the caller.
func applyMetricFilter(q *gorm.DB, filter MetricFilter) *gorm.DB {
	if len(filter.Types) > 0 {
		q = q.Where("type IN ?", filter.Types)
	}
	if !filter.From.IsZero() {
		q = q.Where("timestamp >= ?", filter.From)
	}
	if !filter.To.IsZero() {
		q = q.Where("timestamp <= ?", filter.To)
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit)
	}
	return q
}
