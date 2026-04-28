// device.go contains the PostgreSQL implementation of DeviceRepository.
// Key operations beyond basic CRUD: FindByIP (used by EnsureDevice during
// agent ingest), UpdateStatus (called on heartbeat and offline detection),
// and FindStale (used by the background offline-checker worker).
package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
)

type deviceRepository struct {
	db *gorm.DB
}

func newDeviceRepository(db *gorm.DB) DeviceRepository {
	return &deviceRepository{db: db}
}

// Create inserts a new device. Fails if the IP address is already registered.
func (r *deviceRepository) Create(device *models.Device) error {
	return r.db.Create(device).Error
}

func (r *deviceRepository) FindAll(filter DeviceFilter) ([]models.Device, error) {
	var devices []models.Device
	q := r.db.Model(&models.Device{})

	if filter.Type != "" {
		q = q.Where("type = ?", filter.Type)
	}
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Search != "" {
		pattern := "%" + filter.Search + "%"
		q = q.Where("hostname ILIKE ? OR ip_address ILIKE ? OR name ILIKE ?", pattern, pattern, pattern)
	}
	if filter.Since != nil {
		q = q.Where("created_at >= ?", filter.Since)
	}

	if err := q.Order("name ASC").Find(&devices).Error; err != nil {
		return nil, err
	}
	return devices, nil
}

func (r *deviceRepository) FindByID(id uuid.UUID) (*models.Device, error) {
	var device models.Device
	if err := r.db.First(&device, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &device, nil
}

func (r *deviceRepository) FindByIP(ip string) (*models.Device, error) {
	var device models.Device
	if err := r.db.Where("ip_address = ?", ip).First(&device).Error; err != nil {
		return nil, err
	}
	return &device, nil
}

func (r *deviceRepository) FindByHostname(hostname string) (*models.Device, error) {
	var device models.Device
	if err := r.db.Where("hostname = ?", hostname).First(&device).Error; err != nil {
		return nil, err
	}
	return &device, nil
}

func (r *deviceRepository) Update(device *models.Device) error {
	return r.db.Save(device).Error
}

func (r *deviceRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Device{}, "id = ?", id).Error
}

// UpdateStatus atomically sets a device's status and last_seen timestamp.
// Used by heartbeat processing and the offline background worker.
func (r *deviceRepository) UpdateStatus(id uuid.UUID, status models.DeviceStatus, lastSeen time.Time) error {
	return r.db.Model(&models.Device{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":    status,
			"last_seen": lastSeen,
		}).Error
}

// FindStale returns online/unknown devices that haven't reported since before the given time.
func (r *deviceRepository) FindStale(before time.Time) ([]models.Device, error) {
	var devices []models.Device
	err := r.db.Where("status != ? AND (last_seen IS NULL OR last_seen < ?)", models.DeviceStatusOffline, before).
		Find(&devices).Error
	return devices, err
}
