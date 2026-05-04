package repository

import (
	"database/sql"
	"fmt"
	"time"

	"sentrynet/backend/internal/models"

	"github.com/google/uuid"
)

type deviceRepository struct{ db *sql.DB }

func newDeviceRepository(db *sql.DB) DeviceRepository { return &deviceRepository{db: db} }

func (r *deviceRepository) Create(device *models.Device) error {
	if device.ID == uuid.Nil {
		device.ID = uuid.New()
	}
	now := time.Now()
	device.CreatedAt, device.UpdatedAt = now, now
	_, err := r.db.Exec(
		`INSERT INTO devices
			(id, name, type, hostname, ip_address, status, description, location, last_seen, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		device.ID, device.Name, device.Type, device.Hostname, device.IPAddress, device.Status, device.Description, device.Location, device.LastSeen, device.CreatedAt, device.UpdatedAt,
	)
	return err
}

func (r *deviceRepository) FindAll(filter DeviceFilter) ([]models.Device, error) {
	query := `SELECT id, name, type, hostname, ip_address, status, description, location, last_seen, created_at, updated_at
	FROM devices WHERE TRUE`
	args := []any{}
	n := 1
	if filter.Type != "" {
		query += fmt.Sprintf(" AND type = $%d", n)
		args = append(args, filter.Type)
		n++
	}

	if filter.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", n)
		args = append(args, filter.Status)
		n++
	}

	if filter.Search != "" {
		pattern := "%" + filter.Search + "%"
		query += fmt.Sprintf(" AND (hostname ILIKE $%d OR ip_address ILIKE $%d OR name ILIKE $%d)", n, n+1, n+2)
		args = append(args, pattern, pattern, pattern)
		n += 3
	}

	if filter.Since != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", n)
		args = append(args, filter.Since)
		n++
	}

	query += " ORDER BY name ASC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDevices(rows)
}

func (r *deviceRepository) FindByID(id uuid.UUID) (*models.Device, error) {
	d, err := scanDevice(r.db.QueryRow(
		`SELECT id, name, type, hostname, ip_address, status, description, location, last_seen, created_at, updated_at
		FROM devices WHERE id = $1`, id,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return d, err
}

func (r *deviceRepository) FindByIP(ip string) (*models.Device, error) {
	d, err := scanDevice(r.db.QueryRow(
		`SELECT id, name, type, hostname, ip_address, status, description, location, last_seen, created_at, updated_at
		FROM devices WHERE ip_address = $1`, ip,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return d, err
}

func (r *deviceRepository) FindByHostname(hostname string) (*models.Device, error) {
	d, err := scanDevice(r.db.QueryRow(
		`SELECT id, name, type, hostname, ip_address, status, description, location, last_seen, created_at, updated_at
		FROM devices WHERE hostname = $1`, hostname,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return d, err
}

func (r *deviceRepository) Update(device *models.Device) error {
	device.UpdatedAt = time.Now()
	_, err := r.db.Exec(
		`UPDATE devices
		SET name=$1, type=$2, hostname=$3, ip_address=$4, status=$5,
		description=$6, location=$7, last_seen=$8, updated_at=$9 WHERE id=$10`,
		device.Name, device.Type, device.Hostname, device.IPAddress, device.Status,
		device.Description, device.Location, device.LastSeen, device.UpdatedAt, device.ID,
	)
	return err
}

func (r *deviceRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM devices where id=$1`, id)
	return err
}

func (r *deviceRepository) UpdateStatus(id uuid.UUID, status models.DeviceStatus, lastSeen time.Time) error {
	_, err := r.db.Exec(
		`UPDATE devices set status=$1, last_seen=$2, updated_at=NOW() WHERE id=$3`,
		status, lastSeen, id,
	)
	return err
}

func (r *deviceRepository) FindStale(before time.Time) ([]models.Device, error) {
	rows, err := r.db.Query(
		`SELECT id, name, type, hostname, ip_address, status, description, location, last_seen, created_at, updated_at
		FROM devices
		WHERE status != $1 AND (last_seen IS NULL OR last_seen <$2)`,
		models.DeviceStatusOffline, before,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDevices(rows)
}

func scanDevice(s rowScanner) (*models.Device, error) {
	var d models.Device
	err := s.Scan(
		&d.ID, &d.Name, &d.Type, &d.Hostname, &d.IPAddress, &d.Status,
		&d.Description, &d.Location, &d.LastSeen, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func scanDevices(rows *sql.Rows) ([]models.Device, error) {
	var result []models.Device
	for rows.Next() {
		d, err := scanDevice(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *d)
	}
	return result, rows.Err()
}
