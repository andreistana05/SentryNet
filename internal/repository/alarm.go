// alarm.go contains the PostgreSQL implementations for the four repositories
// that cover the ITIL escalation chain: AlarmRepository, IncidentRepository,
// ProblemRepository, and TicketRepository. Each section is labelled with a
// comment banner for easy navigation.
package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"sentrynet/backend/internal/models"
)

// ---- Alarm Repository ----

type alarmRepository struct {
	db *sql.DB
}

func newAlarmRepository(db *sql.DB) AlarmRepository {
	return &alarmRepository{db: db}
}

func (r *alarmRepository) Create(alarm *models.Alarm) error {
	if alarm.ID == uuid.Nil{
		alarm.ID = uuid.New()
	}
	now := time.Now()
	alarm.SubmitDate, alarm.LastModifiedDate = now, now
	_, err := r.db.Exec(
		`INSERT INTO alarms (id, alarm_number, alarm, hyperlink, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		alarm.ID, alarm.AlarmNumber, alarm.Alarm, alarm.Hyperlink, alarm.Status, alarm.SubmitDate, alarm.LastModifiedDate, alarm.CloseDate, alarm.Priority, alarm.AssignedGroup, alarm.AssignedPerson,
	)
	return err
}

func (r *alarmRepository) FindAll(filter AlarmFilter) ([]models.Alarm, error) {
	query := `SELECT id, alarm_number, alarm, hyperlink, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
			  FROM alarms WHERE TRUE`
	args := []any{}
	n := 1
	if filter.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", n); args = append(args, filter.Status); n++
	}
	if filter.Priority != "" {
		query += fmt.Sprintf(" AND priority = $%d", n); args = append(args, filter.Priority); n++
	}
	if filter.Search != "" {
		query += fmt.Sprintf(" AND (alarm_number ILIKE $%d)", n)
		args = append(args, "%"+filter.Search+"%"); n++
	}
	query += " ORDER BY submit_date DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", n); args = append(args, filter.Limit); n++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", n); args = append(args, filter.Offset)
	}

	rows, err :=r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAlarms(rows)
}

func (r *alarmRepository) FindByID(id uuid.UUID) (*models.Alarm, error) {
	a, err := scanAlarm(r.db.QueryRow(
		`SELECT id, alarm_number, alarm, hyperlink, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
	     FROM alarms WHERE id = $1`, id,
	))
	if err == sql.ErrNoRows{
		return nil, ErrNotFound
	}
	return a, err
}

func (r *alarmRepository) FindByNumber(number string) (*models.Alarm, error) {
	a, err := scanAlarm(r.db.QueryRow(
		`SELECT id, alarm_number, alarm, hyperlink, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
		 FROM alarms WHERE alarm_number = $1`, number,
	))
	if err == sql.ErrNoRows{
		return nil, ErrNotFound
	}
	return a, err
}

// NextAlarmNumber generates the next sequential alarm number (e.g. ALM0042).
// It counts all existing alarms (including closed ones) to avoid reuse.
func (r *alarmRepository) NextAlarmNumber() (string, error) {
	var count int64
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM alarms`).Scan(&count); err != nil{
		return "", err
	}
	return fmt.Sprintf("ALM%04d", count+1), nil
}

func (r *alarmRepository) Update(alarm *models.Alarm) error {
	alarm.LastModifiedDate = time.Now()
	_, err := r.db.Exec(
		`UPDATE alarms
		SET alarm_number = $1, alarm = $2, hyperlink = $3, status = $4, last_modified_date = $5, close_date = $6, priority = $7, assigned_group = $8, assigned_person = $9
		WHERE id = $10`,
		alarm.AlarmNumber, alarm.Alarm, alarm.Hyperlink, alarm.Status, alarm.LastModifiedDate, alarm.CloseDate, alarm.Priority, alarm.AssignedGroup, alarm.AssignedPerson, alarm.ID,
	)
	return err
}

func (r *alarmRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM alarms WHERE id = $1`, id)
	return err
}

func (r *alarmRepository) CountByStatus(status models.TicketStatus) (int64, error) {
	var count int64
	err := r.db.QueryRow(`SELECT COUNT(*) FROM alarms WHERE status = $1`, status).Scan(&count)
	return count, err
}

// ---- Incident Repository ----

type incidentRepository struct {
	db *sql.DB
}

func newIncidentRepository(db *sql.DB) IncidentRepository {
	return &incidentRepository{db: db}
}

func (r *incidentRepository) Create(incident *models.Incident) error {
	if incident.ID == uuid.Nil {
		incident.ID = uuid.New()
	}
	now := time.Now()
	incident.SubmitDate, incident.LastModifiedDate = now, now
	_, err := r.db.Exec(
		`INSERT INTO incidents (id, incident_number, alarm_id, hyperlink, description, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		 incident.ID, incident.IncidentNumber, incident.AlarmID, incident.Hyperlink, incident.Description, incident.Status, incident.SubmitDate, incident.LastModifiedDate, incident.CloseDate, incident.Priority, incident.AssignedGroup, incident.AssignedPerson,
	)
	return err
}

// FindAll fetches incidents with filters, then does a second IN query to populate
func (r *incidentRepository) FindAll(filter IncidentFilter) ([]models.Incident, error) {
	query := `SELECT id, incident_number, alarm_id, hyperlink, description, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
			  FROM incidents WHERE TRUE`
	args := []any{}
	n := 1

	if filter.Status != ""{
		query += fmt.Sprintf(" AND status = $%d", n); args = append(args, filter.Status); n++
	}
	if(filter.Priority != ""){
		query += fmt.Sprintf(" AND priority = $%d", n); args = append(args, filter.Priority); n++
	}
	if filter.AlarmID != nil {
		query += fmt.Sprintf(" AND alarm_id = $%d", n); args = append(args, filter.AlarmID); n++
	}
	if filter.Search != "" {
		query += fmt.Sprintf(" AND( incident_number ILIKE $%d)", n)
		args = append(args, "%"+filter.Search+"%"); n++
	}
	query +=" ORDER BY submit_date DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", n); args = append(args, filter.Limit); n++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", n); args = append(args, filter.Offset)
	}
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	incidents, err := scanIncidents(rows)
	if err != nil {
		return nil, err
	}
	if err := r.preloadAlarms(incidents); err != nil {
		return nil, err
	}
	return incidents, nil
}

func (r *incidentRepository) FindByID(id uuid.UUID) (*models.Incident, error) {
	inc, err := scanIncident(r.db.QueryRow(
		`SELECT id, incident_number, alarm_id, hyperlink, description, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
		 FROM incidents WHERE id = $1`, id,
	))
	if err == sql.ErrNoRows{
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if inc.AlarmID != nil {
		alarm, err := (&alarmRepository{r.db}).FindByID(*inc.AlarmID)
		if err == nil {
			inc.SourceAlarm = alarm
		}
	}
	return inc, nil
}

func (r *incidentRepository) FindByNumber(number string) (*models.Incident, error) {
	inc, err := scanIncident(r.db.QueryRow(
		`SELECT id, incident_number, alarm_id, hyperlink, description, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
		 FROM incidents WHERE incident_number = $1`, number,
	))
	if err == sql.ErrNoRows{
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if inc.AlarmID != nil {
		alarm, err := (&alarmRepository{r.db}).FindByID(*inc.AlarmID)
		if err == nil {
			inc.SourceAlarm = alarm
		}
	}
	return inc, nil
}

func (r *incidentRepository) FindByAlarm(alarmID uuid.UUID) ([]models.Incident, error) {
	rows, err := r.db.Query(
		`SELECT id, incident_number, alarm_id, hyperlink, description, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
		 FROM incidents WHERE alarm_id = $1 ORDER BY submit_date DESC`, alarmID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanIncidents(rows)
}

func (r *incidentRepository) Update(incident *models.Incident) error {
	incident.LastModifiedDate = time.Now()
	_, err := r.db.Exec(
		`UPDATE incidents
		SET incident_number = $1, alarm_id = $2, hyperlink = $3, description = $4, status = $5, last_modified_date = $6, close_date = $7, priority = $8, assigned_group = $9, assigned_person = $10
		WHERE id = $11`,
		incident.IncidentNumber, incident.AlarmID, incident.Hyperlink, incident.Description, incident.Status, incident.LastModifiedDate, incident.CloseDate,
		incident.Priority, incident.AssignedGroup, incident.AssignedPerson, incident.ID,
	)
	return err
}

func (r *incidentRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM incidents WHERE id = $1`, id)
	return err
}

// NextIncidentNumber generates the next sequential incident number (e.g. INC0007).
func (r *incidentRepository) NextIncidentNumber() (string, error) {
	var count int64
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM incidents`).Scan(&count); err != nil {
		return "", err
	}
	return fmt.Sprintf("INC%04d", count+1), nil
}

// preloadAlarms fetches all alarms referenced by the incident slice in one IN query.
func (r *incidentRepository) preloadAlarms(incidents []models.Incident) error{
	idSet := map[uuid.UUID]struct{}{}
	for _, inc := range incidents {
		if inc.AlarmID != nil {
			idSet[*inc.AlarmID] = struct{}{}
		}
	}
	if len(idSet) == 0 {
		return nil
	}
	ph, args := buildInPlaceholders(idSet)
	rows, err := r.db.Query(
		`SELECT id, alarm_number, alarm, hyperlink, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person
		 FROM alarms WHERE id IN (`+ph+`)`, args...,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	alarmMap := map[uuid.UUID]*models.Alarm{}
	for rows.Next() {
		a, err := scanAlarm(rows)
		if err != nil {
			return err
		}
		alarmMap[a.ID] = a
	}
	if err := rows.Err(); err != nil{
		return err
	}
	for i := range incidents {
		if incidents[i].AlarmID != nil {
			incidents[i].SourceAlarm = alarmMap[*incidents[i].AlarmID]
		}
	}
	return nil
}

// ---- scan helpers ----

type scanner interface{ Scan(dest ...any) error }

func scanAlarm(s scanner) (*models.Alarm, error) {
	a := &models.Alarm{}
	err := s.Scan(
		&a.ID, &a.AlarmNumber, &a.Alarm, &a.Hyperlink, &a.Status,
		&a.SubmitDate, &a.LastModifiedDate, &a.CloseDate,
		&a.Priority, &a.AssignedGroup, &a.AssignedPerson,
	)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func scanAlarms(rows *sql.Rows) ([]models.Alarm, error) {
	var alarms []models.Alarm
	for rows.Next() {
		a, err := scanAlarm(rows)
		if err != nil {
			return nil, err
		}
		alarms = append(alarms, *a)
	}
	return alarms, rows.Err()
}

func scanIncident(s scanner) (*models.Incident, error) {
	inc := &models.Incident{}
	err := s.Scan(
		&inc.ID, &inc.IncidentNumber, &inc.AlarmID, &inc.Hyperlink, &inc.Description,
		&inc.Status, &inc.SubmitDate, &inc.LastModifiedDate, &inc.CloseDate,
		&inc.Priority, &inc.AssignedGroup, &inc.AssignedPerson,
	)
	if err != nil {
		return nil, err
	}
	return inc, nil
}

func scanIncidents(rows *sql.Rows) ([]models.Incident, error) {
	var incidents []models.Incident
	for rows.Next() {
		inc, err := scanIncident(rows)
		if err != nil {
			return nil, err
		}
		incidents = append(incidents, *inc)
	}
	return incidents, rows.Err()
}

func buildInPlaceholders(ids map[uuid.UUID]struct{}) (string, []any) {
	args := make([]any, 0, len(ids))
	phs := make([]string, 0, len(ids))
	n := 1
	for id := range ids {
		phs = append(phs, fmt.Sprintf("$%d", n))
		args = append(args, id)
		n++
	}
	return strings.Join(phs, ","), args
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
