// postgres.go sets up the GORM PostgreSQL connection, runs schema migrations,
// and provides the Repositories container that wires every repository
// implementation together. This is the only file that knows about the
// underlying database driver — the rest of the app uses interfaces.
package repository

import (
	"database/sql"
	"errors"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var ErrNotFound = errors.New("record not found")

// Repositories groups every repository interface in one convenient container.
type Repositories struct {
	User            UserRepository
	Device          DeviceRepository
	Metric          MetricRepository
	MetricAggregate MetricAggregateRepository
	Alarm           AlarmRepository
	Incident        IncidentRepository
	Problem         ProblemRepository
	Ticket          TicketRepository
	Group           GroupRepository
	Employee        EmployeeRepository
	TicketWorker    TicketWorkerRepository
}

// nullUUID handles scanning nullable UUID columns (e.g. alarm_id on incidents)
type nullUUID struct {
	UUID  uuid.UUID
	Valid bool
}

func (n *nullUUID) Scan(value any) error {
	if value == nil {
		n.Valid = false
		return nil
	}
	n.Valid = true
	return n.UUID.Scan(value)
}

type rowScanner interface{ Scan(dest ...any) error }

func NewPostgres(dsn string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	return db, nil
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id				UUID			PRIMARY KEY,
			username		VARCHAR(100) 	NOT NULL UNIQUE,
			email			VARCHAR(255)	NOT NULL UNIQUE,
			password_hash	VARCHAR			NOT NULL,
			role			VARCHAR(20)		NOT NULL DEFAULT 'viewer',
			created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS devices (
			id			UUID			PRIMARY KEY,
			name		VARCHAR(255)	NOT NULL,
			type		VARCHAR(20)		NOT NULL,
			hostname	VARCHAR(255),
			ip_address	VARCHAR(45)		UNIQUE,
			status		VARCHAR(20)		NOT NULL DEFAULT 'unknown',
			description	VARCHAR(500),
			location	VARCHAR(255),
			last_seen	TIMESTAMPTZ,
			created_at	TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			updated_at	TIMESTAMPTZ		NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS metrics (
			id			UUID		PRIMARY KEY,
			device_id	UUID		NOT NULL REFERENCES devices(id),
			type		VARCHAR(50)	NOT NULL,
			value		FLOAT8		NOT NULL,
			unit		VARCHAR(255),
			timestamp	TIMESTAMPTZ	NOT NULL
		);
		CREATE TABLE IF NOT EXISTS metric_aggregates (
			id				UUID		PRIMARY KEY,
			device_id		UUID		NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
			type			VARCHAR(50)	NOT NULL,
			avg_value		FLOAT8		NOT NULL,
			min_value		FLOAT8		NOT NULL,
			max_value		FLOAT8		NOT NULL,
			sample_count	INT			NOT NULL,
			unit			VARCHAR(255),
			period_start	TIMESTAMPTZ	NOT NULL,
			period_end		TIMESTAMPTZ	NOT NULL,
			created_at		TIMESTAMPTZ	NOT NULL DEFAULT NOW(),
			UNIQUE (device_id, type, period_start)
		);
		CREATE TABLE IF NOT EXISTS alarms (
			id					UUID			PRIMARY KEY,
			alarm_number		VARCHAR(20)		NOT NULL UNIQUE,
			alarm				VARCHAR(255)	NOT NULL,
			hyperlink			VARCHAR(500),
			status				VARCHAR(20)		NOT NULL DEFAULT 'Open',
			submit_date			TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			last_modified_date	TIMESTAMPTZ 	NOT NULL DEFAULT NOW(),
			close_date			TIMESTAMPTZ,
			priority			VARCHAR(10)		NOT NULL,
			assigned_group		VARCHAR(255),
			assigned_person		VARCHAR(255)
		);
		CREATE TABLE IF NOT EXISTS incidents (
			id					UUID			PRIMARY KEY,
			incident_number		VARCHAR(20)		NOT NULL UNIQUE,
			alarm_id			UUID			REFERENCES alarms(id),
			hyperlink			VARCHAR(500),
			description			VARCHAR(1000)	NOT NULL,
			status				VARCHAR(20)		NOT NULL DEFAULT 'Open',
			submit_date			TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			last_modified_date	TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			close_date			TIMESTAMPTZ,
			priority			VARCHAR(10)		NOT NULL,
			assigned_group		VARCHAR(255),
			assigned_person		VARCHAR(255)
		);
		CREATE TABLE IF NOT EXISTS problems (
			id					UUID			PRIMARY KEY,
			problem_number		VARCHAR(20)		NOT NULL UNIQUE,
			alarm_name			VARCHAR(255)	NOT NULL,
			incident_id			UUID			REFERENCES incidents(id),
			hyperlink			VARCHAR(500),
			description			VARCHAR(1000)	NOT NULL,
			status				VARCHAR(20)		NOT NULL DEFAULT 'Open',
			submit_date			TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			last_modified_date	TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			close_date			TIMESTAMPTZ,
			priority			VARCHAR(10)		NOT NULL,
			assigned_group		VARCHAR(255),
			assigned_person		VARCHAR(255),
			occurrence_count	INT				NOT NULL DEFAULT 1
		);
		CREATE TABLE IF NOT EXISTS tickets (
			id					UUID			PRIMARY KEY,
			ticket_number		VARCHAR(20)		NOT NULL UNIQUE,
			incident_id			UUID			NOT NULL UNIQUE REFERENCES incidents(id),
			title				VARCHAR(255)	NOT NULL,
			status				VARCHAR(20)		NOT NULL DEFAULT 'Open',
			priority			VARCHAR(10)		NOT NULL,
			assigned_group		VARCHAR(255),
			assigned_person		VARCHAR(255),
			submit_date			TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			last_modified_date	TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
			close_date			TIMESTAMPTZ
		);
		CREATE TABLE IF NOT EXISTS ticket_updates (
			id			UUID			PRIMARY KEY,
			ticket_id	UUID			NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
			event_type	VARCHAR(30)		NOT NULL,
			description	VARCHAR(500)	NOT NULL,
			timestamp	TIMESTAMPTZ		NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS ticket_notes (
			id			UUID			PRIMARY KEY,
			ticket_id	UUID			NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
			body		TEXT			NOT NULL,
			author_name	VARCHAR(255)	NOT NULL,
			created_at	TIMESTAMPTZ		NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS groups (
			id          UUID         PRIMARY KEY,
			name        VARCHAR(255) NOT NULL UNIQUE,
			description VARCHAR(500),
			created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS employees (
			id         UUID         PRIMARY KEY,
			group_id   UUID         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
			name       VARCHAR(255) NOT NULL,
			email      VARCHAR(255) NOT NULL UNIQUE,
			role       VARCHAR(100),
			created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS ticket_workers (
			ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
			employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
			assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (ticket_id, employee_id)
		);

		ALTER TABLE metrics ALTER COLUMN unit TYPE VARCHAR(255);
		ALTER TABLE metric_aggregates ALTER COLUMN unit TYPE VARCHAR(255);
	`)
	return err
}

func NewRepositories(db *sql.DB) *Repositories {
	return &Repositories{
		User:            newUserRepository(db),
		Device:          newDeviceRepository(db),
		Metric:          newMetricRepository(db),
		MetricAggregate: newMetricAggregateRepository(db),
		Alarm:           newAlarmRepository(db),
		Incident:        newIncidentRepository(db),
		Problem:         newProblemRepository(db),
		Ticket:          newTicketRepository(db),
		Group:           newGroupRepository(db),
		Employee:        newEmployeeRepository(db),
		TicketWorker:    newTicketWorkerRepository(db),
	}
}
