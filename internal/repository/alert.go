package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
)

// ---- Alert Repository ----

type alertRepository struct {
	db *gorm.DB
}

func newAlertRepository(db *gorm.DB) AlertRepository {
	return &alertRepository{db: db}
}

func (r *alertRepository) Create(alert *models.Alert) error {
	return r.db.Create(alert).Error
}

func (r *alertRepository) FindAll(filter AlertFilter) ([]models.Alert, error) {
	var alerts []models.Alert
	q := r.db.Preload("Device").Preload("Rule")

	if filter.DeviceID != nil {
		q = q.Where("device_id = ?", filter.DeviceID)
	}
	if filter.Severity != "" {
		q = q.Where("severity = ?", filter.Severity)
	}
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		q = q.Offset(filter.Offset)
	}

	if err := q.Order("created_at DESC").Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (r *alertRepository) FindByID(id uuid.UUID) (*models.Alert, error) {
	var alert models.Alert
	if err := r.db.Preload("Device").Preload("Rule").First(&alert, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &alert, nil
}

func (r *alertRepository) FindByDevice(deviceID uuid.UUID) ([]models.Alert, error) {
	var alerts []models.Alert
	if err := r.db.Where("device_id = ?", deviceID).Order("created_at DESC").Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (r *alertRepository) Update(alert *models.Alert) error {
	return r.db.Save(alert).Error
}

func (r *alertRepository) FindActiveByDeviceAndRule(deviceID, ruleID uuid.UUID) (*models.Alert, error) {
	var alert models.Alert
	err := r.db.Where("device_id = ? AND rule_id = ? AND status IN ?", deviceID, ruleID,
		[]models.AlertStatus{models.AlertStatusActive, models.AlertStatusAcknowledged}).
		First(&alert).Error
	if err != nil {
		return nil, err
	}
	return &alert, nil
}

func (r *alertRepository) FindActiveByDevice(deviceID uuid.UUID) ([]models.Alert, error) {
	var alerts []models.Alert
	err := r.db.Where("device_id = ? AND status IN ?", deviceID,
		[]models.AlertStatus{models.AlertStatusActive, models.AlertStatusAcknowledged}).
		Find(&alerts).Error
	return alerts, err
}

func (r *alertRepository) CountByStatus(status models.AlertStatus) (int64, error) {
	var count int64
	err := r.db.Model(&models.Alert{}).Where("status = ?", status).Count(&count).Error
	return count, err
}

// ---- AlertRule Repository ----

type alertRuleRepository struct {
	db *gorm.DB
}

func newAlertRuleRepository(db *gorm.DB) AlertRuleRepository {
	return &alertRuleRepository{db: db}
}

func (r *alertRuleRepository) Create(rule *models.AlertRule) error {
	return r.db.Create(rule).Error
}

func (r *alertRuleRepository) FindAll() ([]models.AlertRule, error) {
	var rules []models.AlertRule
	if err := r.db.Preload("Device").Find(&rules).Error; err != nil {
		return nil, err
	}
	return rules, nil
}

func (r *alertRuleRepository) FindByID(id uuid.UUID) (*models.AlertRule, error) {
	var rule models.AlertRule
	if err := r.db.First(&rule, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &rule, nil
}

// FindApplicable returns enabled rules that apply to the given device (by ID) or device type.
func (r *alertRuleRepository) FindApplicable(deviceID uuid.UUID, deviceType models.DeviceType) ([]models.AlertRule, error) {
	var rules []models.AlertRule
	err := r.db.Where("enabled = true AND (device_id = ? OR (device_id IS NULL AND (device_type = ? OR device_type IS NULL)))",
		deviceID, deviceType).
		Find(&rules).Error
	return rules, err
}

func (r *alertRuleRepository) Update(rule *models.AlertRule) error {
	return r.db.Save(rule).Error
}

func (r *alertRuleRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.AlertRule{}, "id = ?", id).Error
}
