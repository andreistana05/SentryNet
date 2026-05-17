// Package service contains the business logic layer for SentryNet.
// Each service wraps one or more repositories and enforces domain rules
// (validation, state transitions, escalation chains) before touching the DB.
package service

import (
	"errors"
	"time"

	"github.com/redis/go-redis/v9"

	"sentrynet/backend/internal/config"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/pkg/jwt"
)

// ErrNotFound is returned when a requested resource does not exist.
var ErrNotFound = errors.New("not found")

// Services is a container for all service instances.
type Services struct {
	Auth           *AuthService
	Device         *DeviceService
	Metric         *MetricService
	Alarm          *AlarmService
	MetricArchiver *MetricArchiverService
	Group          *GroupService
	SLA            *SLAService
}

func NewServices(repos *repository.Repositories, rdb *redis.Client, cfg *config.Config) *Services {
	jwtMgr := jwt.NewManager(cfg.JWTSecret, cfg.JWTExpiry)

	alarmSvc := newAlarmService(
		repos.Alarm,
		repos.Incident,
		repos.Problem,
		repos.Device,
		repos.Ticket,
		cfg.OfflineCheckInterval,
		cfg.HeartbeatTimeout,
		rdb,
	)

	metricSvc := newMetricService(repos.Metric, alarmSvc)
	deviceSvc := newDeviceService(repos.Device)
	authSvc := newAuthService(repos.User, jwtMgr)
	archiverSvc := newMetricArchiverService(
		repos.Metric,
		repos.MetricAggregate,
		30*24*time.Hour, // retain raw metrics for 30 days
		24*time.Hour,    // run archival once per day
	)

	groupSvc := newGroupService(repos.Group, repos.Employee, repos.TicketWorker, repos.Ticket)
	slaSvc := newSLAService(repos.Ticket, 15*time.Minute)

	return &Services{
		Auth:           authSvc,
		Device:         deviceSvc,
		Metric:         metricSvc,
		Alarm:          alarmSvc,
		MetricArchiver: archiverSvc,
		Group:          groupSvc,
		SLA:            slaSvc,
	}
}
