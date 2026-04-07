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

func (r *metricRepository) Create(metric *models.Metric) error {
	return r.db.Create(metric).Error
}

func (r *metricRepository) CreateBatch(metrics []models.Metric) error {
	if len(metrics) == 0 {
		return nil
	}
	return r.db.Create(&metrics).Error
}

func (r *metricRepository) FindByDevice(deviceID uuid.UUID, filter MetricFilter) ([]models.Metric, error) {
	var metrics []models.Metric
	q := r.db.Where("device_id = ?", deviceID)
	q = applyMetricFilter(q, filter)

	if err := q.Order("timestamp DESC").Find(&metrics).Error; err != nil {
		return nil, err
	}
	return metrics, nil
}

// FindLatestByDevice returns the most recent metric for each type for the given device.
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

func (r *metricRepository) FindAll(filter MetricFilter) ([]models.Metric, error) {
	var metrics []models.Metric
	q := r.db.Model(&models.Metric{})
	q = applyMetricFilter(q, filter)

	if err := q.Order("timestamp DESC").Find(&metrics).Error; err != nil {
		return nil, err
	}
	return metrics, nil
}

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
