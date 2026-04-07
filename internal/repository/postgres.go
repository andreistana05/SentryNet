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
	return db.AutoMigrate(
		&models.User{},
		&models.Device{},
		&models.Metric{},
		&models.Alarm{},
		&models.Incident{},
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
	Ticket   TicketRepository
}

func NewRepositories(db *gorm.DB) *Repositories {
	return &Repositories{
		User:     newUserRepository(db),
		Device:   newDeviceRepository(db),
		Metric:   newMetricRepository(db),
		Alarm:    newAlarmRepository(db),
		Incident: newIncidentRepository(db),
		Ticket:   newTicketRepository(db),
	}
}
