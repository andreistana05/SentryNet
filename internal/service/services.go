package service

import (
	"errors"

	"github.com/redis/go-redis/v9"

	"sentrynet/backend/internal/config"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/pkg/jwt"
)

// ErrNotFound is returned when a requested resource does not exist.
var ErrNotFound = errors.New("not found")

// Services is a container for all service instances.
type Services struct {
	Auth   *AuthService
	Device *DeviceService
	Metric *MetricService
	Alert  *AlertService
}

func NewServices(repos *repository.Repositories, _ *redis.Client, cfg *config.Config) *Services {
	jwtMgr := jwt.NewManager(cfg.JWTSecret, cfg.JWTExpiry)

	alertSvc := newAlertService(
		repos.Alert,
		repos.AlertRule,
		repos.Device,
		cfg.OfflineCheckInterval,
		cfg.HeartbeatTimeout,
	)

	metricSvc := newMetricService(repos.Metric, alertSvc)
	deviceSvc := newDeviceService(repos.Device)
	authSvc := newAuthService(repos.User, jwtMgr)

	return &Services{
		Auth:   authSvc,
		Device: deviceSvc,
		Metric: metricSvc,
		Alert:  alertSvc,
	}
}
