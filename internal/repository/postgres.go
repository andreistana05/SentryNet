package repository

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"sentrynet/backend/internal/models"
)

func NewPostgres(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)

	return db, nil
}

// Migrate runs GORM auto-migration for all models.
func Migrate(db *gorm.DB) error {
	// Pre-migration: add alarm_number to existing rows so GORM can enforce NOT NULL.
	// This is a no-op if the column already exists.
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = CURRENT_SCHEMA()
				  AND table_name   = 'alarms'
				  AND column_name  = 'alarm_number'
			) THEN
				-- Add as nullable first to accommodate existing rows.
				ALTER TABLE alarms ADD COLUMN alarm_number varchar(20);
				-- Populate with unique sequential numbers (ALM0001, ALM0002, …).
				UPDATE alarms
				   SET alarm_number = 'ALM' || LPAD(CAST(seq AS TEXT), 4, '0')
				  FROM (
				       SELECT id, ROW_NUMBER() OVER (ORDER BY submit_date, id) AS seq
				         FROM alarms
				       ) ranked
				 WHERE alarms.id = ranked.id;
				-- Now safe to add NOT NULL.
				ALTER TABLE alarms ALTER COLUMN alarm_number SET NOT NULL;
			END IF;
		END $$;
	`).Error; err != nil {
		return fmt.Errorf("pre-migrate alarm_number: %w", err)
	}

	return db.AutoMigrate(
		&models.User{},
		&models.Device{},
		&models.Metric{},
		&models.Alarm{},
		&models.Incident{},
		&models.Problem{},
		&models.Ticket{},
		&models.TicketUpdate{},
	)
}

// Repositories is a container for all repository implementations.
type Repositories struct {
	User     UserRepository
	Device   DeviceRepository
	Metric   MetricRepository
	Alarm    AlarmRepository
	Incident IncidentRepository
	Problem  ProblemRepository
	Ticket   TicketRepository
}

func NewRepositories(db *gorm.DB) *Repositories {
	return &Repositories{
		User:     newUserRepository(db),
		Device:   newDeviceRepository(db),
		Metric:   newMetricRepository(db),
		Alarm:    newAlarmRepository(db),
		Incident: newIncidentRepository(db),
		Problem:  newProblemRepository(db),
		Ticket:   newTicketRepository(db),
	}
}
