package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"sentrynet/backend/internal/models"
)

type metricRepository struct{ db *sql.DB }

func newMetricRepository(db *sql.DB) MetricRepository { return &metricRepository{db: db} }

func (r *metricRepository) Create(metric *models.Metric) error {
	if metric.ID == uuid.Nil {
		metric.ID = uuid.New()
	}
	_, err := r.db.Exec(
		`INSERT INTO metrics (id, device_id, type, value, unit, timestamp)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		metric.ID, metric.DeviceID, metric.Type, metric.Value, metric.Unit, metric.Timestamp,
	)
	return err
}

func (r *metricRepository) CreateBatch(metrics []models.Metric) error {
	if len(metrics) == 0 {
		return nil
	}
	placeholders := make([]string, len(metrics))
	args := make([]any, 0, len(metrics)*6)
	for i, m := range metrics{
		if m.ID == uuid.Nil{
			m.ID = uuid.New()
		}
		base := i*6
		placeholders[i] = fmt.Sprintf("($%d,$%d,$%d,$%d,$%d,$%d)",
			base+1, base+2, base+3, base+4, base+5, base+6)
		args = append(args, m.ID, m.DeviceID, m.Type, m.Value, m.Unit, m.Timestamp)
	}
	_, err := r.db.Exec(
		"INSERT INTO metrics (id, device_id, type, value, unit, timestamp) VALUES "+
			strings.Join(placeholders, ","),
		args...,
	)
	return err
}

func (r *metricRepository) FindByDevice(deviceID uuid.UUID, filter MetricFilter) ([]models.Metric, error) {
	query := `SELECT id, device_id, type, value, unit, timestamp
			FROM metrics WHERE device_id = $1`
	args := []any{deviceID}
	n := 2
	if len(filter.Types) >0 {
		ph := make([]string, len(filter.Types))
		for i, t := range filter.Types {
			ph[i] = fmt.Sprintf("$%d",n); args = append(args, t); n++
		}
		query += " AND type IN (" + strings.Join(ph, ",") + ")"
	}
	if !filter.From.IsZero() {
		query += fmt.Sprintf(" AND timestamp >= $%d", n); args = append(args, filter.From); n++
	}
	if !filter.To.IsZero() {
		query += fmt.Sprintf(" AND timestamp <= $%d", n); args = append(args, filter.To); n++
	}
	query += " ORDER BY timestamp ASC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", n); args = append(args, filter.Limit)
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMetrics(rows)
}

func (r *metricRepository) FindLatestByDevice(deviceID uuid.UUID) ([]models.Metric, error) {
	rows, err := r.db.Query(`
		SELECT m.id, m.device_id, m.type, m.value, m.unit, m.timestamp
		FROM metrics m
		INNER JOIN(
			SELECT type, MAX(timestamp) AS max_ts
			FROM metrics
			WHERE device_id = $1
			GROUP BY type
			) latest ON m.type = latest.type AND m.timestamp = latest.max_ts
			WHERE m.device_id = $1`,
			deviceID,
		)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMetrics(rows)
}

func (r *metricRepository) FindAll(filter MetricFilter) ([]models.Metric, error) {
	query := "SELECT id, device_id, type, value, unit, timestamp FROM metrics WHERE TRUE"
	args := []any{}
	n := 1

	if len(filter.Types) > 0 {
		ph := make([]string, len(filter.Types))
		for i, t := range filter.Types {
			ph[i] = fmt.Sprintf("$%d",n); args = append(args, t); n++
		}
		query += " AND type IN (" + strings.Join(ph, ",") + ")"
	}
	if !filter.From.IsZero() {
		query += fmt.Sprintf(" AND timestamp >= $%d", n); args = append(args, filter.From); n++
	}
	if !filter.To.IsZero() {
		query += fmt.Sprintf(" AND timestamp <= $%d", n); args = append(args, filter.To); n++
	}
	query += " ORDER BY timestamp DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", n); args = append(args, filter.Limit)
	}
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMetrics(rows)
}

func (r *metricRepository) DeleteBefore(cutoff time.Time) (int64, error) {
	res, err := r.db.Exec(`DELETE FROM metrics WHERE timestamp < $1`, cutoff)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func scanMetric(s rowScanner) (*models.Metric, error) {
	var m models.Metric
	if err := s.Scan(&m.ID, &m.DeviceID, &m.Type, &m.Value, &m.Unit, &m.Timestamp); err != nil {
		return nil, err
	}
	return &m, nil
}

func scanMetrics(rows *sql.Rows) ([]models.Metric, error) {
	var result []models.Metric
	for rows.Next() {
		m ,err := scanMetric(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *m)
	}
	return result, rows.Err()
}
