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
	query := `SELECT id, alarm_number, alarm, COALESCE(hyperlink, ''), status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
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
		`SELECT id, alarm_number, alarm, COALESCE(hyperlink, ''), status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
	     FROM alarms WHERE id = $1`, id,
	))
	if err == sql.ErrNoRows{
		return nil, ErrNotFound
	}
	return a, err
}

func (r *alarmRepository) FindByNumber(number string) (*models.Alarm, error) {
	a, err := scanAlarm(r.db.QueryRow(
		`SELECT id, alarm_number, alarm, COALESCE(hyperlink, ''), status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
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
	query := `SELECT id, incident_number, alarm_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
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
		`SELECT id, incident_number, alarm_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
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
		`SELECT id, incident_number, alarm_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
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
		`SELECT id, incident_number, alarm_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
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
		`SELECT id, alarm_number, alarm, COALESCE(hyperlink, ''), status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
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
	var alarmID nullUUID
	err := s.Scan(
		&inc.ID, &inc.IncidentNumber, &alarmID, &inc.Hyperlink, &inc.Description,
		&inc.Status, &inc.SubmitDate, &inc.LastModifiedDate, &inc.CloseDate,
		&inc.Priority, &inc.AssignedGroup, &inc.AssignedPerson,
	)
	if err != nil {
		return nil, err
	}
	if alarmID.Valid {
		inc.AlarmID = &alarmID.UUID
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
	db *sql.DB
}

func newProblemRepository(db *sql.DB) ProblemRepository {
	return &problemRepository{db: db}
}

func (r *problemRepository) Create(problem *models.Problem) error {
	if problem.ID == uuid.Nil {
		problem.ID = uuid.New()
	}
	now := time.Now()
	problem.SubmitDate, problem.LastModifiedDate = now, now
	_, err := r.db.Exec(
		`INSERT INTO problems (id, problem_number, alarm_name, incident_id, hyperlink, description, status, submit_date, last_modified_date, close_date, priority, assigned_group, assigned_person, occurrence_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		problem.ID, problem.ProblemNumber, problem.AlarmName, problem.IncidentID, problem.Hyperlink, problem.Description, problem.Status, problem.SubmitDate, problem.LastModifiedDate, problem.CloseDate, problem.Priority, problem.AssignedGroup, problem.AssignedPerson, problem.OccurrenceCount,
	)
	return err
}

func (r *problemRepository) FindAll(filter ProblemFilter) ([]models.Problem, error) {
	query := `SELECT id, problem_number, alarm_name, incident_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), occurrence_count
			  FROM problems WHERE TRUE`
	args := []any{}
	n := 1

	if filter.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", n); args = append(args, filter.Status); n++
	}
	if filter.Priority != "" {
		query += fmt.Sprintf(" AND priority = $%d", n); args = append(args, filter.Priority); n++
	}
	if filter.AlarmName != "" {
		query += fmt.Sprintf(" AND alarm_name = $%d", n); args = append(args, filter.AlarmName); n++
	}
	if filter.Search != "" {
		query += fmt.Sprintf(" AND problem_number ILIKE $%d", n); args = append(args, "%"+filter.Search+"%"); n++
	}
	query += " ORDER BY submit_date DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", n); args = append(args, filter.Limit); n++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", n); args = append(args, filter.Offset); n++
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	problems, err := scanProblems(rows)
	if err != nil {
		return nil, err
	}
	if err := r.preloadIncidents(problems); err != nil {
		return nil, err
	}
	return problems, nil

}

func (r *problemRepository) FindByID(id uuid.UUID) (*models.Problem, error) {
	prob, err := scanProblem(r.db.QueryRow(
		`SELECT id, problem_number, alarm_name, incident_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), occurrence_count
		 FROM problems WHERE id = $1`, id,
	))
	if err == sql.ErrNoRows{
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if prob.IncidentID != nil {
		inc, err := (&incidentRepository{r.db}).FindByID(*prob.IncidentID)
		if err == nil {
			prob.SourceIncident = inc
		}
	}
	return prob, nil
}

func (r *problemRepository) FindByNumber(number string) (*models.Problem, error) {
	prob, err := scanProblem(r.db.QueryRow(
		`SELECT id, problem_number, alarm_name, incident_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), occurrence_count
		 FROM problems WHERE problem_number = $1`, number,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if prob.IncidentID != nil {
		inc, err := (&incidentRepository{r.db}).FindByID(*prob.IncidentID)
		if err == nil {
			prob.SourceIncident = inc
		}
	}
	return prob, nil
}

func (r *problemRepository) FindOpenByAlarmName(alarmName string) (*models.Problem, error) {
	prob, err := scanProblem(r.db.QueryRow(
		`SELECT id, problem_number, alarm_name, incident_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), occurrence_count
		 FROM problems WHERE alarm_name = $1 AND status != $2`, alarmName, models.StatusClosed,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return prob, err
}

func (r *problemRepository) Update(problem *models.Problem) error {
	problem.LastModifiedDate = time.Now()
	_, err := r.db.Exec(
		`UPDATE problems
		SET problem_number = $1, alarm_name = $2, incident_id = $3, hyperlink = $4, description = $5, status = $6, last_modified_date = $7, close_date = $8, priority = $9, assigned_group = $10, assigned_person = $11, occurrence_count = $12
		WHERE id = $13`,
		problem.ProblemNumber, problem.AlarmName, problem.IncidentID, problem.Hyperlink, problem.Description,
		problem.Status, problem.LastModifiedDate, problem.CloseDate,
		problem.Priority, problem.AssignedGroup, problem.AssignedPerson, problem.OccurrenceCount, problem.ID,
	)
	return err	
}

func (r *problemRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM problems WHERE id = $1`, id)
	return err
}

// NextProblemNumber generates the next sequential problem number (e.g. PRB0003).
func (r *problemRepository) NextProblemNumber() (string, error) {
	var count int64
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM problems`).Scan(&count); err != nil {
		return "", err
	}
	return fmt.Sprintf("PRB%04d", count+1), nil
}

// ---- Ticket Repository ----

type ticketRepository struct {
	db *sql.DB
}

func newTicketRepository(db *sql.DB) TicketRepository {
	return &ticketRepository{db: db}
}

func (r *ticketRepository) Create(ticket *models.Ticket) error {
	if ticket.ID == uuid.Nil {
		ticket.ID = uuid.New()
	}
	now := time.Now()
	ticket.SubmitDate, ticket.LastModifiedDate = now, now
	_, err := r.db.Exec(
		`INSERT INTO tickets (id, ticket_number, incident_id, title, status, priority, assigned_group, assigned_person, submit_date, last_modified_date, close_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		 ticket.ID, ticket.TicketNumber, ticket.IncidentID, ticket.Title,
		 ticket.Status, ticket.Priority, ticket.AssignedGroup, ticket.AssignedPerson,
		 ticket.SubmitDate, ticket.LastModifiedDate, ticket.CloseDate,
	)
	return err	
}

func (r *ticketRepository) FindAll(filter TicketFilter) ([]models.Ticket, error) {
	query := `SELECT id, ticket_number, incident_id, title, status, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), submit_date, last_modified_date, close_date
			  FROM tickets WHERE TRUE`
	args := []any{}
	n := 1

	if filter.IncidentID != nil {
		query += fmt.Sprintf(" AND incident_id = $%d", n); args = append(args, filter.IncidentID); n++
	}
	if filter.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", n); args = append(args, filter.Status); n++
	}
	if filter.Priority != "" {
		query += fmt.Sprintf(" AND priority = $%d", n); args = append(args, filter.Priority); n++
	}
	if filter.Search != "" {
		query += fmt.Sprintf(" AND ticket_number ILIKE $%d", n); args = append(args, "%"+filter.Search+"%"); n++
	}
	query +=" ORDER BY submit_date DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", n); args = append(args, filter.Limit); n++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", n); args = append(args, filter.Offset); n++
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tickets, err := scanTickets(rows)
	if err != nil {
		return nil, err
	}
	if err := r.preloadIncidents(tickets); err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *ticketRepository) FindByID(id uuid.UUID) (*models.Ticket, error) {
	tick, err := scanTicket(r.db.QueryRow(
		`SELECT id, ticket_number, incident_id, title, status, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), submit_date, last_modified_date, close_date
		 FROM tickets WHERE id = $1`, id,
	))
	if err == sql.ErrNoRows{
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if tick.IncidentID != uuid.Nil {
		inc, err := (&incidentRepository{r.db}).FindByID(tick.IncidentID)
		if err == nil {
			tick.SourceIncident = inc
		}
	}
	return tick, nil
}

func (r *ticketRepository) FindByNumber(number string) (*models.Ticket, error) {
	tick, err := scanTicket(r.db.QueryRow(
		`SELECT id, ticket_number, incident_id, title, status, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), submit_date, last_modified_date, close_date
		 FROM tickets WHERE ticket_number = $1`, number,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if tick.IncidentID != uuid.Nil {
		inc, err := (&incidentRepository{r.db}).FindByID(tick.IncidentID)
		if err == nil {
			tick.SourceIncident = inc
		}
	}
	return tick, nil
}

func (r *ticketRepository) FindByIncidentID(incidentID uuid.UUID) (*models.Ticket, error) {
	tick, err := scanTicket(r.db.QueryRow(
		`SELECT id, ticket_number, incident_id, title, status, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, ''), submit_date, last_modified_date, close_date
		 FROM tickets WHERE incident_id = $1`, incidentID,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return tick, err
}

func (r *ticketRepository) Update(ticket *models.Ticket) error {
	ticket.LastModifiedDate = time.Now()
	_, err := r.db.Exec(
		`UPDATE tickets
		SET ticket_number = $1, incident_id = $2, title = $3, status = $4, priority = $5, assigned_group = $6, assigned_person = $7, last_modified_date = $8, close_date = $9
		WHERE id = $10`,
		ticket.TicketNumber, ticket.IncidentID, ticket.Title,
		ticket.Status, ticket.Priority, ticket.AssignedGroup, ticket.AssignedPerson,
		ticket.LastModifiedDate, ticket.CloseDate, ticket.ID,
	)
	return err
}

func (r *ticketRepository) AddUpdate(update *models.TicketUpdate) error {
	if update.ID == uuid.Nil {
        update.ID = uuid.New()
    }
    if update.Timestamp.IsZero() {
        update.Timestamp = time.Now()
    }

    _, err := r.db.Exec(
        `INSERT INTO ticket_updates (id, ticket_id, event_type, description, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        update.ID, update.TicketID, update.EventType, update.Description, update.Timestamp,
    )
    return err
}

// NextTicketNumber generates the next sequential ticket number (e.g. TKT0015).
func (r *ticketRepository) NextTicketNumber() (string, error) {
	var count int64
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM tickets`).Scan(&count); err != nil {
		return "", err
	}
	return fmt.Sprintf("TKT%04d", count+1), nil
}

func (r *ticketRepository) FindNotesByTicketID(ticketID uuid.UUID) ([]models.TicketNote, error) {
	rows, err := r.db.Query(
        `SELECT id, ticket_id, body, author_name, created_at
         FROM ticket_notes
         WHERE ticket_id = $1
         ORDER BY created_at ASC`,
        ticketID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    return scanTicketNotes(rows)
}

func (r *ticketRepository) CreateNote(note *models.TicketNote) error {
	if note.ID == uuid.Nil {
        note.ID = uuid.New()
    }
    if note.CreatedAt.IsZero() {
        note.CreatedAt = time.Now()
    }

    _, err := r.db.Exec(
        `INSERT INTO ticket_notes (id, ticket_id, body, author_name, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        note.ID, note.TicketID, note.Body, note.AuthorName, note.CreatedAt,
    )
    return err
}

// ---- Problem scan helpers ----

func scanProblem(s scanner) (*models.Problem, error) {
	p := &models.Problem{}
	var incidentID nullUUID
	err := s.Scan(
		&p.ID, &p.ProblemNumber, &p.AlarmName, &incidentID, &p.Hyperlink, &p.Description,
		&p.Status, &p.SubmitDate, &p.LastModifiedDate, &p.CloseDate,
		&p.Priority, &p.AssignedGroup, &p.AssignedPerson, &p.OccurrenceCount,
	)
	if err != nil {
		return nil, err
	}
	if incidentID.Valid {
		p.IncidentID = &incidentID.UUID
	}
	return p, nil
}

func scanProblems(rows *sql.Rows) ([]models.Problem, error) {
	var problems []models.Problem
	for rows.Next() {
		p, err := scanProblem(rows)
		if err != nil {
			return nil, err
		}
		problems = append(problems, *p)
	}
	return problems, rows.Err()
}

func (r *problemRepository) preloadIncidents(problems []models.Problem) error {
	idSet := map[uuid.UUID]struct{}{}
	for _, p := range problems {
		if p.IncidentID != nil {
			idSet[*p.IncidentID] = struct{}{}
		}
	}
	if len(idSet) == 0 {
		return nil
	}
	ph, args := buildInPlaceholders(idSet)
	rows, err := r.db.Query(
		`SELECT id, incident_number, alarm_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
		 FROM incidents WHERE id IN (`+ph+`)`, args...,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	incMap := map[uuid.UUID]*models.Incident{}
	for rows.Next() {
		inc, err := scanIncident(rows)
		if err != nil {
			return err
		}
		incMap[inc.ID] = inc
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for i := range problems {
		if problems[i].IncidentID != nil {
			problems[i].SourceIncident = incMap[*problems[i].IncidentID]
		}
	}
	return nil
}

// ---- Ticket scan helpers ----

func scanTicket(s scanner) (*models.Ticket, error) {
	t := &models.Ticket{}
	err := s.Scan(
		&t.ID, &t.TicketNumber, &t.IncidentID, &t.Title,
		&t.Status, &t.Priority, &t.AssignedGroup, &t.AssignedPerson,
		&t.SubmitDate, &t.LastModifiedDate, &t.CloseDate,
	)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func scanTickets(rows *sql.Rows) ([]models.Ticket, error) {
	var tickets []models.Ticket
	for rows.Next() {
		t, err := scanTicket(rows)
		if err != nil {
			return nil, err
		}
		tickets = append(tickets, *t)
	}
	return tickets, rows.Err()
}

func scanTicketNotes(rows *sql.Rows) ([]models.TicketNote, error) {
	var notes []models.TicketNote
	for rows.Next() {
		n := models.TicketNote{}
		if err := rows.Scan(&n.ID, &n.TicketID, &n.Body, &n.AuthorName, &n.CreatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

func (r *ticketRepository) preloadIncidents(tickets []models.Ticket) error {
	idSet := map[uuid.UUID]struct{}{}
	for _, t := range tickets {
		if t.IncidentID != uuid.Nil {
			idSet[t.IncidentID] = struct{}{}
		}
	}
	if len(idSet) == 0 {
		return nil
	}
	ph, args := buildInPlaceholders(idSet)
	rows, err := r.db.Query(
		`SELECT id, incident_number, alarm_id, COALESCE(hyperlink, ''), description, status, submit_date, last_modified_date, close_date, priority, COALESCE(assigned_group, ''), COALESCE(assigned_person, '')
		 FROM incidents WHERE id IN (`+ph+`)`, args...,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	incMap := map[uuid.UUID]*models.Incident{}
	for rows.Next() {
		inc, err := scanIncident(rows)
		if err != nil {
			return err
		}
		incMap[inc.ID] = inc
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for i := range tickets {
		if tickets[i].IncidentID != uuid.Nil {
			tickets[i].SourceIncident = incMap[tickets[i].IncidentID]
		}
	}
	return nil
}
