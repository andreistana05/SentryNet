package repository

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
)

// ---- Alarm Repository ----

type alarmRepository struct {
	db *gorm.DB
}

func newAlarmRepository(db *gorm.DB) AlarmRepository {
	return &alarmRepository{db: db}
}

func (r *alarmRepository) Create(alarm *models.Alarm) error {
	return r.db.Create(alarm).Error
}

func (r *alarmRepository) FindAll(filter AlarmFilter) ([]models.Alarm, error) {
	var alarms []models.Alarm
	q := r.db.Model(&models.Alarm{})

	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		q = q.Where("priority = ?", filter.Priority)
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		q = q.Offset(filter.Offset)
	}

	if err := q.Order("submit_date DESC").Find(&alarms).Error; err != nil {
		return nil, err
	}
	return alarms, nil
}

func (r *alarmRepository) FindByID(id uuid.UUID) (*models.Alarm, error) {
	var alarm models.Alarm
	if err := r.db.First(&alarm, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &alarm, nil
}

func (r *alarmRepository) Update(alarm *models.Alarm) error {
	return r.db.Save(alarm).Error
}

func (r *alarmRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Alarm{}, "id = ?", id).Error
}

func (r *alarmRepository) CountByStatus(status models.TicketStatus) (int64, error) {
	var count int64
	err := r.db.Model(&models.Alarm{}).Where("status = ?", status).Count(&count).Error
	return count, err
}

// ---- Incident Repository ----

type incidentRepository struct {
	db *gorm.DB
}

func newIncidentRepository(db *gorm.DB) IncidentRepository {
	return &incidentRepository{db: db}
}

func (r *incidentRepository) Create(incident *models.Incident) error {
	return r.db.Create(incident).Error
}

func (r *incidentRepository) FindAll(filter IncidentFilter) ([]models.Incident, error) {
	var incidents []models.Incident
	q := r.db.Preload("SourceAlarm")

	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		q = q.Where("priority = ?", filter.Priority)
	}
	if filter.AlarmID != nil {
		q = q.Where("alarm_id = ?", filter.AlarmID)
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		q = q.Offset(filter.Offset)
	}

	if err := q.Order("submit_date DESC").Find(&incidents).Error; err != nil {
		return nil, err
	}
	return incidents, nil
}

func (r *incidentRepository) FindByID(id uuid.UUID) (*models.Incident, error) {
	var incident models.Incident
	if err := r.db.Preload("SourceAlarm").First(&incident, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &incident, nil
}

func (r *incidentRepository) FindByAlarm(alarmID uuid.UUID) ([]models.Incident, error) {
	var incidents []models.Incident
	if err := r.db.Where("alarm_id = ?", alarmID).Order("submit_date DESC").Find(&incidents).Error; err != nil {
		return nil, err
	}
	return incidents, nil
}

func (r *incidentRepository) Update(incident *models.Incident) error {
	return r.db.Save(incident).Error
}

func (r *incidentRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Incident{}, "id = ?", id).Error
}

func (r *incidentRepository) NextIncidentNumber() (string, error) {
	var count int64
	if err := r.db.Model(&models.Incident{}).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("INC%04d", count+1), nil
}
