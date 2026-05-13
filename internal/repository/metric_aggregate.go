package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"sentrynet/backend/internal/models"
)

type metricAggregateRepository struct{ db *sql.DB }

func newMetricAggregateRepository(db *sql.DB) MetricAggregateRepository {
	return &metricAggregateRepository{db: db}
}

// InsertFromMetrics runs a single INSERT … SELECT that groups raw metrics older than
// cutoff by (device_id, type, UTC day) and writes daily summaries.
// ON CONFLICT DO NOTHING makes it safe to call multiple times.
func (r *metricAggregateRepository) InsertFromMetrics(cutoff time.Time) (int64, error) {
	res, err := r.db.Exec(`
		INSERT INTO metric_aggregates
			(id, device_id, type, avg_value, min_value, max_value, sample_count, unit, period_start, period_end, created_at)
		SELECT
			uuid_generate_v4(),
			device_id,
			type,
			AVG(value),
			MIN(value),
			MAX(value),
			COUNT(*)::INT,
			MAX(unit),
			DATE_TRUNC('day', timestamp AT TIME ZONE 'UTC'),
			DATE_TRUNC('day', timestamp AT TIME ZONE 'UTC') + INTERVAL '1 day' - INTERVAL '1 microsecond',
			NOW()
		FROM metrics
		WHERE timestamp < $1
		GROUP BY device_id, type, DATE_TRUNC('day', timestamp AT TIME ZONE 'UTC')
		ON CONFLICT (device_id, type, period_start) DO NOTHING
	`, cutoff)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *metricAggregateRepository) FindByDevice(deviceID uuid.UUID, from, to time.Time) ([]models.MetricAggregate, error) {
	rows, err := r.db.Query(`
		SELECT id, device_id, type, avg_value, min_value, max_value, sample_count, unit, period_start, period_end, created_at
		FROM metric_aggregates
		WHERE device_id = $1 AND period_start >= $2 AND period_end <= $3
		ORDER BY period_start ASC
	`, deviceID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAggregates(rows)
}

func (r *metricAggregateRepository) FindAll(from, to time.Time) ([]models.MetricAggregate, error) {
	rows, err := r.db.Query(`
		SELECT id, device_id, type, avg_value, min_value, max_value, sample_count, unit, period_start, period_end, created_at
		FROM metric_aggregates
		WHERE period_start >= $1 AND period_end <= $2
		ORDER BY period_start ASC
	`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAggregates(rows)
}

func scanAggregates(rows *sql.Rows) ([]models.MetricAggregate, error) {
	var result []models.MetricAggregate
	for rows.Next() {
		var a models.MetricAggregate
		if err := rows.Scan(
			&a.ID, &a.DeviceID, &a.Type,
			&a.AvgValue, &a.MinValue, &a.MaxValue, &a.SampleCount,
			&a.Unit, &a.PeriodStart, &a.PeriodEnd, &a.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, a)
	}
	return result, rows.Err()
}
