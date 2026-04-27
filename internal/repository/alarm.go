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
	if filter.Search != "" {
		q = q.Where("alarm_number ILIKE ?", "%"+filter.Search+"%")
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

func (r *alarmRepository) FindByNumber(number string) (*models.Alarm, error) {
	var alarm models.Alarm
	if err := r.db.First(&alarm, "alarm_number = ?", number).Error; err != nil {
		return nil, err
	}
	return &alarm, nil
}

// NextAlarmNumber generates the next sequential alarm number (e.g. ALM0042).
// It counts all existing alarms (including closed ones) to avoid reuse.
func (r *alarmRepository) NextAlarmNumber() (string, error) {
	var count int64
	if err := r.db.Model(&models.Alarm{}).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("ALM%04d", count+1), nil
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
	if filter.Search != "" {
		q = q.Where("incident_number ILIKE ?", "%"+filter.Search+"%")
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

func (r *incidentRepository) FindByNumber(number string) (*models.Incident, error) {
	var incident models.Incident
	if err := r.db.Preload("SourceAlarm").First(&incident, "incident_number = ?", number).Error; err != nil {
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

// NextIncidentNumber generates the next sequential incident number (e.g. INC0007).
func (r *incidentRepository) NextIncidentNumber() (string, error) {
	var count int64
	if err := r.db.Model(&models.Incident{}).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("INC%04d", count+1), nil
}

// ---- Problem Repository ----

type problemRepository struct {
	db *gorm.DB
}

func newProblemRepository(db *gorm.DB) ProblemRepository {
	return &problemRepository{db: db}
}

func (r *problemRepository) Create(problem *models.Problem) error {
	return r.db.Create(problem).Error
}

func (r *problemRepository) FindAll(filter ProblemFilter) ([]models.Problem, error) {
	var problems []models.Problem
	q := r.db.Preload("SourceIncident")

	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		q = q.Where("priority = ?", filter.Priority)
	}
	if filter.AlarmName != "" {
		q = q.Where("alarm_name = ?", filter.AlarmName)
	}
	if filter.Search != "" {
		q = q.Where("problem_number ILIKE ?", "%"+filter.Search+"%")
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		q = q.Offset(filter.Offset)
	}

	if err := q.Order("submit_date DESC").Find(&problems).Error; err != nil {
		return nil, err
	}
	return problems, nil
}

func (r *problemRepository) FindByID(id uuid.UUID) (*models.Problem, error) {
	var problem models.Problem
	if err := r.db.Preload("SourceIncident").First(&problem, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &problem, nil
}

func (r *problemRepository) FindByNumber(number string) (*models.Problem, error) {
	var problem models.Problem
	if err := r.db.Preload("SourceIncident").First(&problem, "problem_number = ?", number).Error; err != nil {
		return nil, err
	}
	return &problem, nil
}

func (r *problemRepository) FindOpenByAlarmName(alarmName string) (*models.Problem, error) {
	var problem models.Problem
	err := r.db.Where("alarm_name = ? AND status != ?", alarmName, models.StatusClosed).
		Order("submit_date DESC").
		First(&problem).Error
	if err != nil {
		return nil, err
	}
	return &problem, nil
}

func (r *problemRepository) Update(problem *models.Problem) error {
	return r.db.Save(problem).Error
}

func (r *problemRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Problem{}, "id = ?", id).Error
}

// NextProblemNumber generates the next sequential problem number (e.g. PRB0003).
func (r *problemRepository) NextProblemNumber() (string, error) {
	var count int64
	if err := r.db.Model(&models.Problem{}).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("PRB%04d", count+1), nil
}

// ---- Ticket Repository ----

type ticketRepository struct {
	db *gorm.DB
}

func newTicketRepository(db *gorm.DB) TicketRepository {
	return &ticketRepository{db: db}
}

func (r *ticketRepository) Create(ticket *models.Ticket) error {
	return r.db.Create(ticket).Error
}

func (r *ticketRepository) FindAll(filter TicketFilter) ([]models.Ticket, error) {
	var tickets []models.Ticket
	q := r.db.Model(&models.Ticket{}).
		Preload("Updates", func(db *gorm.DB) *gorm.DB {
			return db.Order("timestamp ASC")
		})

	if filter.IncidentID != nil {
		q = q.Where("incident_id = ?", filter.IncidentID)
	}
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		q = q.Where("priority = ?", filter.Priority)
	}
	if filter.Search != "" {
		q = q.Where("ticket_number ILIKE ?", "%"+filter.Search+"%")
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		q = q.Offset(filter.Offset)
	}

	if err := q.Order("submit_date DESC").Find(&tickets).Error; err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *ticketRepository) FindByID(id uuid.UUID) (*models.Ticket, error) {
	var ticket models.Ticket
	err := r.db.Preload("Updates", func(db *gorm.DB) *gorm.DB {
		return db.Order("timestamp ASC")
	}).First(&ticket, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *ticketRepository) FindByNumber(number string) (*models.Ticket, error) {
	var ticket models.Ticket
	err := r.db.Preload("Updates", func(db *gorm.DB) *gorm.DB {
		return db.Order("timestamp ASC")
	}).First(&ticket, "ticket_number = ?", number).Error
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *ticketRepository) FindByIncidentID(incidentID uuid.UUID) (*models.Ticket, error) {
	var ticket models.Ticket
	err := r.db.Preload("Updates", func(db *gorm.DB) *gorm.DB {
		return db.Order("timestamp ASC")
	}).First(&ticket, "incident_id = ?", incidentID).Error
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *ticketRepository) Update(ticket *models.Ticket) error {
	return r.db.Save(ticket).Error
}

func (r *ticketRepository) AddUpdate(update *models.TicketUpdate) error {
	return r.db.Create(update).Error
}

// NextTicketNumber generates the next sequential ticket number (e.g. TKT0015).
func (r *ticketRepository) NextTicketNumber() (string, error) {
	var count int64
	if err := r.db.Model(&models.Ticket{}).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("TKT%04d", count+1), nil
}

func (r *ticketRepository) FindNotesByTicketID(ticketID uuid.UUID) ([]models.TicketNote, error) {
	var notes []models.TicketNote
	if err := r.db.Where("ticket_id = ?", ticketID).Order("created_at ASC").Find(&notes).Error; err != nil {
		return nil, err
	}
	return notes, nil
}

func (r *ticketRepository) CreateNote(note *models.TicketNote) error {
	return r.db.Create(note).Error
}
