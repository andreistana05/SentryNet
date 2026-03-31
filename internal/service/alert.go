package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
)

type AlertService struct {
	alerts     repository.AlertRepository
	alertRules repository.AlertRuleRepository
	devices    repository.DeviceRepository
	interval   time.Duration
	timeout    time.Duration
}

func newAlertService(
	alerts repository.AlertRepository,
	alertRules repository.AlertRuleRepository,
	devices repository.DeviceRepository,
	offlineCheckInterval time.Duration,
	heartbeatTimeout time.Duration,
) *AlertService {
	return &AlertService{
		alerts:     alerts,
		alertRules: alertRules,
		devices:    devices,
		interval:   offlineCheckInterval,
		timeout:    heartbeatTimeout,
	}
}

// EvaluateMetrics checks all applicable alert rules for the given device/metrics and creates alerts as needed.
func (s *AlertService) EvaluateMetrics(deviceID uuid.UUID, deviceType models.DeviceType, items []IngestMetricItem) {
	rules, err := s.alertRules.FindApplicable(deviceID, deviceType)
	if err != nil {
		log.Printf("alert evaluation: failed to fetch rules: %v", err)
		return
	}

	// Build a map of metric type -> value for quick lookup.
	values := make(map[models.MetricType]float64, len(items))
	for _, item := range items {
		values[item.Type] = item.Value
	}

	for _, rule := range rules {
		value, ok := values[rule.MetricType]
		if !ok {
			continue
		}

		if rule.Evaluate(value) {
			s.createAlertIfAbsent(deviceID, rule, value)
		} else {
			s.autoResolveAlert(deviceID, rule)
		}
	}
}

func (s *AlertService) createAlertIfAbsent(deviceID uuid.UUID, rule models.AlertRule, value float64) {
	_, err := s.alerts.FindActiveByDeviceAndRule(deviceID, rule.ID)
	if err == nil {
		return // alert already exists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("alert evaluation: FindActiveByDeviceAndRule: %v", err)
		return
	}

	alert := &models.Alert{
		DeviceID: deviceID,
		RuleID:   &rule.ID,
		Severity: rule.Severity,
		Status:   models.AlertStatusActive,
		Title:    fmt.Sprintf("%s threshold breached", rule.MetricType),
		Message:  fmt.Sprintf("Rule '%s': %s value %.2f %s threshold %.2f", rule.Name, rule.MetricType, value, rule.Operator, rule.Threshold),
	}
	if err := s.alerts.Create(alert); err != nil {
		log.Printf("alert evaluation: failed to create alert: %v", err)
	}
}

func (s *AlertService) autoResolveAlert(deviceID uuid.UUID, rule models.AlertRule) {
	alert, err := s.alerts.FindActiveByDeviceAndRule(deviceID, rule.ID)
	if err != nil {
		return // no active alert, nothing to resolve
	}

	now := time.Now()
	alert.Status = models.AlertStatusResolved
	alert.ResolvedAt = &now
	if err := s.alerts.Update(alert); err != nil {
		log.Printf("alert evaluation: failed to auto-resolve alert: %v", err)
	}
}

// CreateOfflineAlert creates a "device offline" alert if one isn't already active.
func (s *AlertService) CreateOfflineAlert(device *models.Device) {
	activeAlerts, err := s.alerts.FindActiveByDevice(device.ID)
	if err != nil {
		log.Printf("offline check: FindActiveByDevice: %v", err)
		return
	}
	for _, a := range activeAlerts {
		if a.RuleID == nil && a.Title == "Device offline" {
			return // already have an offline alert
		}
	}

	alert := &models.Alert{
		DeviceID: device.ID,
		Severity: models.SeverityCritical,
		Status:   models.AlertStatusActive,
		Title:    "Device offline",
		Message:  fmt.Sprintf("Device '%s' (%s) has not reported in over %s", device.Name, device.IPAddress, s.timeout),
	}
	if err := s.alerts.Create(alert); err != nil {
		log.Printf("offline check: failed to create offline alert: %v", err)
	}
}

// StartWorker runs a background goroutine that periodically checks for offline devices.
func (s *AlertService) StartWorker(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.checkOfflineDevices()
			}
		}
	}()
}

func (s *AlertService) checkOfflineDevices() {
	threshold := time.Now().Add(-s.timeout)
	stale, err := s.devices.FindStale(threshold)
	if err != nil {
		log.Printf("offline check: FindStale: %v", err)
		return
	}

	for _, device := range stale {
		log.Printf("offline check: marking device %s (%s) as offline", device.Name, device.IPAddress)
		if err := s.devices.UpdateStatus(device.ID, models.DeviceStatusOffline, time.Now()); err != nil {
			log.Printf("offline check: UpdateStatus: %v", err)
		}
		deviceCopy := device
		s.CreateOfflineAlert(&deviceCopy)
	}
}

// --- Alert management ---

func (s *AlertService) List(filter repository.AlertFilter) ([]models.Alert, error) {
	return s.alerts.FindAll(filter)
}

func (s *AlertService) Get(id uuid.UUID) (*models.Alert, error) {
	alert, err := s.alerts.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return alert, nil
}

func (s *AlertService) Acknowledge(id uuid.UUID) error {
	alert, err := s.Get(id)
	if err != nil {
		return err
	}
	if alert.Status != models.AlertStatusActive {
		return errors.New("alert is not active")
	}
	now := time.Now()
	alert.Status = models.AlertStatusAcknowledged
	alert.AcknowledgedAt = &now
	return s.alerts.Update(alert)
}

func (s *AlertService) Resolve(id uuid.UUID) error {
	alert, err := s.Get(id)
	if err != nil {
		return err
	}
	if alert.Status == models.AlertStatusResolved {
		return errors.New("alert is already resolved")
	}
	now := time.Now()
	alert.Status = models.AlertStatusResolved
	alert.ResolvedAt = &now
	return s.alerts.Update(alert)
}

// --- Alert Rule management ---

type CreateAlertRuleRequest struct {
	Name       string               `json:"name" binding:"required,max=255"`
	DeviceID   *uuid.UUID           `json:"device_id"`
	DeviceType *models.DeviceType   `json:"device_type"`
	MetricType models.MetricType    `json:"metric_type" binding:"required"`
	Operator   models.AlertOperator `json:"operator" binding:"required"`
	Threshold  float64              `json:"threshold"`
	Severity   models.AlertSeverity `json:"severity" binding:"required"`
	Enabled    *bool                `json:"enabled"`
}

type UpdateAlertRuleRequest struct {
	Name      *string               `json:"name" binding:"omitempty,max=255"`
	Operator  *models.AlertOperator `json:"operator"`
	Threshold *float64              `json:"threshold"`
	Severity  *models.AlertSeverity `json:"severity"`
	Enabled   *bool                 `json:"enabled"`
}

func (s *AlertService) ListRules() ([]models.AlertRule, error) {
	return s.alertRules.FindAll()
}

func (s *AlertService) CreateRule(req CreateAlertRuleRequest) (*models.AlertRule, error) {
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	rule := &models.AlertRule{
		Name:       req.Name,
		DeviceID:   req.DeviceID,
		DeviceType: req.DeviceType,
		MetricType: req.MetricType,
		Operator:   req.Operator,
		Threshold:  req.Threshold,
		Severity:   req.Severity,
		Enabled:    enabled,
	}
	if err := s.alertRules.Create(rule); err != nil {
		return nil, err
	}
	return rule, nil
}

func (s *AlertService) GetRule(id uuid.UUID) (*models.AlertRule, error) {
	rule, err := s.alertRules.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return rule, nil
}

func (s *AlertService) UpdateRule(id uuid.UUID, req UpdateAlertRuleRequest) (*models.AlertRule, error) {
	rule, err := s.GetRule(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		rule.Name = *req.Name
	}
	if req.Operator != nil {
		rule.Operator = *req.Operator
	}
	if req.Threshold != nil {
		rule.Threshold = *req.Threshold
	}
	if req.Severity != nil {
		rule.Severity = *req.Severity
	}
	if req.Enabled != nil {
		rule.Enabled = *req.Enabled
	}

	if err := s.alertRules.Update(rule); err != nil {
		return nil, err
	}
	return rule, nil
}

func (s *AlertService) DeleteRule(id uuid.UUID) error {
	if _, err := s.GetRule(id); err != nil {
		return err
	}
	return s.alertRules.Delete(id)
}
