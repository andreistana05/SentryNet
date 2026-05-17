package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"sentrynet/backend/internal/models"
)

// ---- Group Repository ----

type groupRepository struct {
	db *sql.DB
}

func newGroupRepository(db *sql.DB) GroupRepository {
	return &groupRepository{db: db}
}

func (r *groupRepository) Create(group *models.Group) error {
	if group.ID == uuid.Nil {
		group.ID = uuid.New()
	}
	now := time.Now()
	group.CreatedAt, group.UpdatedAt = now, now
	_, err := r.db.Exec(
		`INSERT INTO groups (id, name, description, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		group.ID, group.Name, group.Description, group.CreatedAt, group.UpdatedAt,
	)
	return err
}

func (r *groupRepository) FindAll() ([]models.Group, error) {
	rows, err := r.db.Query(
		`SELECT id, name, description, created_at, updated_at FROM groups ORDER BY name`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanGroups(rows)
}

func (r *groupRepository) FindByID(id uuid.UUID) (*models.Group, error) {
	g, err := scanGroup(r.db.QueryRow(
		`SELECT id, name, description, created_at, updated_at FROM groups WHERE id = $1`, id,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return g, err
}

func (r *groupRepository) Update(group *models.Group) error {
	group.UpdatedAt = time.Now()
	_, err := r.db.Exec(
		`UPDATE groups SET name = $1, description = $2, updated_at = $3 WHERE id = $4`,
		group.Name, group.Description, group.UpdatedAt, group.ID,
	)
	return err
}

func (r *groupRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM groups WHERE id = $1`, id)
	return err
}

func scanGroup(row rowScanner) (*models.Group, error) {
	g := &models.Group{}
	err := row.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedAt, &g.UpdatedAt)
	return g, err
}

func scanGroups(rows *sql.Rows) ([]models.Group, error) {
	var result []models.Group
	for rows.Next() {
		g := models.Group{}
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, g)
	}
	return result, rows.Err()
}

// ---- Employee Repository ----

type employeeRepository struct {
	db *sql.DB
}

func newEmployeeRepository(db *sql.DB) EmployeeRepository {
	return &employeeRepository{db: db}
}

func (r *employeeRepository) Create(emp *models.Employee) error {
	if emp.ID == uuid.Nil {
		emp.ID = uuid.New()
	}
	now := time.Now()
	emp.CreatedAt, emp.UpdatedAt = now, now
	_, err := r.db.Exec(
		`INSERT INTO employees (id, group_id, name, email, role, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		emp.ID, emp.GroupID, emp.Name, emp.Email, emp.Role, emp.CreatedAt, emp.UpdatedAt,
	)
	return err
}

func (r *employeeRepository) FindAll(filter EmployeeFilter) ([]models.Employee, error) {
	query := `SELECT e.id, e.group_id, e.name, e.email, e.role, e.created_at, e.updated_at,
	                 g.id, g.name, g.description, g.created_at, g.updated_at
	          FROM employees e
	          JOIN groups g ON g.id = e.group_id
	          WHERE TRUE`
	args := []any{}
	n := 1
	if filter.GroupID != nil {
		query += fmt.Sprintf(" AND e.group_id = $%d", n)
		args = append(args, *filter.GroupID)
		n++
	}
	if filter.Search != "" {
		query += fmt.Sprintf(" AND (e.name ILIKE $%d OR e.email ILIKE $%d)", n, n)
		args = append(args, "%"+filter.Search+"%")
		n++
	}
	query += " ORDER BY e.name"
	_ = n

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanEmployees(rows)
}

func (r *employeeRepository) FindByID(id uuid.UUID) (*models.Employee, error) {
	emp, err := scanEmployee(r.db.QueryRow(
		`SELECT e.id, e.group_id, e.name, e.email, e.role, e.created_at, e.updated_at,
		        g.id, g.name, g.description, g.created_at, g.updated_at
		 FROM employees e
		 JOIN groups g ON g.id = e.group_id
		 WHERE e.id = $1`, id,
	))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return emp, err
}

func (r *employeeRepository) Update(emp *models.Employee) error {
	emp.UpdatedAt = time.Now()
	_, err := r.db.Exec(
		`UPDATE employees SET group_id = $1, name = $2, email = $3, role = $4, updated_at = $5
		 WHERE id = $6`,
		emp.GroupID, emp.Name, emp.Email, emp.Role, emp.UpdatedAt, emp.ID,
	)
	return err
}

func (r *employeeRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM employees WHERE id = $1`, id)
	return err
}

func scanEmployee(row rowScanner) (*models.Employee, error) {
	emp := &models.Employee{}
	g := &models.Group{}
	err := row.Scan(
		&emp.ID, &emp.GroupID, &emp.Name, &emp.Email, &emp.Role, &emp.CreatedAt, &emp.UpdatedAt,
		&g.ID, &g.Name, &g.Description, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	emp.Group = g
	return emp, nil
}

func scanEmployees(rows *sql.Rows) ([]models.Employee, error) {
	var result []models.Employee
	for rows.Next() {
		emp := models.Employee{}
		g := models.Group{}
		if err := rows.Scan(
			&emp.ID, &emp.GroupID, &emp.Name, &emp.Email, &emp.Role, &emp.CreatedAt, &emp.UpdatedAt,
			&g.ID, &g.Name, &g.Description, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, err
		}
		emp.Group = &g
		result = append(result, emp)
	}
	return result, rows.Err()
}

// ---- TicketWorker Repository ----

type ticketWorkerRepository struct {
	db *sql.DB
}

func newTicketWorkerRepository(db *sql.DB) TicketWorkerRepository {
	return &ticketWorkerRepository{db: db}
}

func (r *ticketWorkerRepository) Assign(ticketID, employeeID uuid.UUID) error {
	_, err := r.db.Exec(
		`INSERT INTO ticket_workers (ticket_id, employee_id, assigned_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT DO NOTHING`,
		ticketID, employeeID,
	)
	return err
}

func (r *ticketWorkerRepository) Unassign(ticketID, employeeID uuid.UUID) error {
	_, err := r.db.Exec(
		`DELETE FROM ticket_workers WHERE ticket_id = $1 AND employee_id = $2`,
		ticketID, employeeID,
	)
	return err
}

func (r *ticketWorkerRepository) FindByTicket(ticketID uuid.UUID) ([]models.TicketWorker, error) {
	rows, err := r.db.Query(
		`SELECT tw.ticket_id, tw.employee_id, tw.assigned_at,
		        e.id, e.group_id, e.name, e.email, e.role, e.created_at, e.updated_at,
		        g.id, g.name, g.description, g.created_at, g.updated_at
		 FROM ticket_workers tw
		 JOIN employees e ON e.id = tw.employee_id
		 JOIN groups g ON g.id = e.group_id
		 WHERE tw.ticket_id = $1
		 ORDER BY tw.assigned_at`,
		ticketID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.TicketWorker
	for rows.Next() {
		var tw models.TicketWorker
		emp := models.Employee{}
		g := models.Group{}
		if err := rows.Scan(
			&tw.TicketID, &tw.EmployeeID, &tw.AssignedAt,
			&emp.ID, &emp.GroupID, &emp.Name, &emp.Email, &emp.Role, &emp.CreatedAt, &emp.UpdatedAt,
			&g.ID, &g.Name, &g.Description, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, err
		}
		emp.Group = &g
		tw.Employee = &emp
		result = append(result, tw)
	}
	return result, rows.Err()
}
