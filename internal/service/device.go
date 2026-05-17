// device.go manages the device inventory. The most important function is
// EnsureDevice, which lets agents and the network monitor register a device
// automatically on first contact — no manual pre-registration required.
// It also handles heartbeat processing that keeps device status up to date.
package service

import (
	"errors"
	"time"

	"github.com/google/uuid"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
)

// DeviceService manages the device inventory and handles heartbeat processing.
type DeviceService struct {
	devices repository.DeviceRepository
}

func newDeviceService(devices repository.DeviceRepository) *DeviceService {
	return &DeviceService{devices: devices}
}

// CreateDeviceRequest is the payload for manually registering a device via the API.
type CreateDeviceRequest struct {
	Name        string            `json:"name" binding:"required,max=255"`
	Type        models.DeviceType `json:"type" binding:"required"`
	Hostname    string            `json:"hostname" binding:"max=255"`
	IPAddress   string            `json:"ip_address" binding:"required,ip"`
	Description string            `json:"description" binding:"max=500"`
	Location    string            `json:"location" binding:"max=255"`
}

// UpdateDeviceRequest carries the optional fields that can be changed on an existing device.
// Pointer fields allow partial updates — nil means "leave unchanged".
type UpdateDeviceRequest struct {
	Name        *string            `json:"name" binding:"omitempty,max=255"`
	Type        *models.DeviceType `json:"type"`
	Hostname    *string            `json:"hostname" binding:"omitempty,max=255"`
	IPAddress   *string            `json:"ip_address" binding:"omitempty,ip"`
	Description *string            `json:"description" binding:"omitempty,max=500"`
	Location    *string            `json:"location" binding:"omitempty,max=255"`
}

func (s *DeviceService) Create(req CreateDeviceRequest) (*models.Device, error) {
	device := &models.Device{
		Name:        req.Name,
		Type:        req.Type,
		Hostname:    req.Hostname,
		IPAddress:   req.IPAddress,
		Description: req.Description,
		Location:    req.Location,
		Status:      models.DeviceStatusUnknown,
	}
	if err := s.devices.Create(device); err != nil {
		return nil, err
	}
	return device, nil
}

func (s *DeviceService) List(filter repository.DeviceFilter) ([]models.Device, error) {
	return s.devices.FindAll(filter)
}

func (s *DeviceService) Get(id uuid.UUID) (*models.Device, error) {
	device, err := s.devices.FindByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return device, nil
}

func (s *DeviceService) Update(id uuid.UUID, req UpdateDeviceRequest) (*models.Device, error) {
	device, err := s.Get(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		device.Name = *req.Name
	}
	if req.Type != nil {
		device.Type = *req.Type
	}
	if req.Hostname != nil {
		device.Hostname = *req.Hostname
	}
	if req.IPAddress != nil {
		device.IPAddress = *req.IPAddress
	}
	if req.Description != nil {
		device.Description = *req.Description
	}
	if req.Location != nil {
		device.Location = *req.Location
	}

	if err := s.devices.Update(device); err != nil {
		return nil, err
	}
	return device, nil
}

func (s *DeviceService) Delete(id uuid.UUID) error {
	if _, err := s.Get(id); err != nil {
		return err
	}
	return s.devices.Delete(id)
}

// EnsureDevice finds or auto-creates a device based on hostname and IP.
// Used by the ingest endpoints so agents don't need to pre-register.
func (s *DeviceService) EnsureDevice(hostname, ip string, deviceType models.DeviceType) (*models.Device, error) {
	device, err := s.devices.FindByIP(ip)
	if err == nil {
		// If the caller provides a more specific type than "server" (e.g. agent
		// sends "workstation"), upgrade the stored type so monitor-created entries
		// don't stay as "server" forever.
		if deviceType != "" && deviceType != models.DeviceTypeServer && device.Type == models.DeviceTypeServer {
			device.Type = deviceType
			_ = s.devices.Update(device)
		}
		return device, nil
	}
	if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	name := hostname
	if name == "" {
		name = ip
	}

	device = &models.Device{
		Name:      name,
		Type:      deviceType,
		Hostname:  hostname,
		IPAddress: ip,
		Status:    models.DeviceStatusOnline,
	}
	now := time.Now()
	device.LastSeen = &now

	if err := s.devices.Create(device); err != nil {
		return nil, err
	}
	return device, nil
}

// ProcessHeartbeat updates device status to online and refreshes last_seen.
func (s *DeviceService) ProcessHeartbeat(deviceID uuid.UUID) error {
	return s.devices.UpdateStatus(deviceID, models.DeviceStatusOnline, time.Now())
}

// MarkOffline sets a device's status to offline.
func (s *DeviceService) MarkOffline(deviceID uuid.UUID) error {
	return s.devices.UpdateStatus(deviceID, models.DeviceStatusOffline, time.Now())
}
