package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
)

// ---- Tiered threshold rules ----

// Tier defines a single severity level within a metric rule.
// The metric value must stay at or above MinValue for at least Duration
// before the alarm is created or escalated to this tier's Priority.
type Tier struct {
	MinValue float64
	Priority models.TicketPriority
	Duration time.Duration
}

// MetricRule defines the tiered thresholds for one metric type.
type MetricRule struct {
	Group string
	Tiers []Tier // ordered from lowest to highest severity
}

// metricRules maps each monitored metric to its tiered threshold configuration.
// Tiers must be listed from least to most severe (ascending MinValue).
var metricRules = map[models.MetricType]MetricRule{
	models.MetricCPUUsage: {
		Group: "IT Support",
		Tiers: []Tier{
			{MinValue: 70, Priority: models.PriorityLow, Duration: 10 * time.Minute},
			{MinValue: 85, Priority: models.PriorityMedium, Duration: 5 * time.Minute},
			{MinValue: 95, Priority: models.PriorityHigh, Duration: 2 * time.Minute},
		},
	},
	models.MetricRAMUsage: {
		Group: "IT Support",
		Tiers: []Tier{
			{MinValue: 75, Priority: models.PriorityLow, Duration: 10 * time.Minute},
			{MinValue: 88, Priority: models.PriorityMedium, Duration: 5 * time.Minute},
			{MinValue: 95, Priority: models.PriorityHigh, Duration: 2 * time.Minute},
		},
	},
	models.MetricDiskUsage: {
		Group: "IT Support",
		Tiers: []Tier{
			{MinValue: 80, Priority: models.PriorityLow, Duration: 30 * time.Minute},
			{MinValue: 90, Priority: models.PriorityMedium, Duration: 15 * time.Minute},
			{MinValue: 97, Priority: models.PriorityHigh, Duration: 5 * time.Minute},
		},
	},
	models.MetricTemperature: {
		Group: "Hardware Team",
		Tiers: []Tier{
			{MinValue: 70, Priority: models.PriorityLow, Duration: 15 * time.Minute},
			{MinValue: 80, Priority: models.PriorityMedium, Duration: 5 * time.Minute},
			{MinValue: 90, Priority: models.PriorityHigh, Duration: 1 * time.Minute},
		},
	},
	models.MetricLatency: {
		Group: "Network Team",
		Tiers: []Tier{
			{MinValue: 200, Priority: models.PriorityLow, Duration: 5 * time.Minute},
			{MinValue: 500, Priority: models.PriorityMedium, Duration: 3 * time.Minute},
			{MinValue: 1000, Priority: models.PriorityHigh, Duration: 1 * time.Minute},
		},
	},
	models.MetricTonerLevel: {
		Group: "Hardware Team",
		Tiers: []Tier{
			// Toner is inverse: alarm when level drops below threshold.
			// Handled separately via tonerRules below.
		},
	},
}

// tonerRules defines low-toner thresholds (value must be <= MinValue).
var tonerRules = MetricRule{
	Group: "Hardware Team",
	Tiers: []Tier{
		{MinValue: 20, Priority: models.PriorityLow, Duration: 60 * time.Minute},
		{MinValue: 10, Priority: models.PriorityMedium, Duration: 30 * time.Minute},
		{MinValue: 5, Priority: models.PriorityHigh, Duration: 10 * time.Minute},
	},
}

// ---- Sustained-breach tracking ----

// breachState records when a device+metric first crossed a given tier boundary.
type breachState struct {
	since   time.Time
	tierIdx int // index into the rule's Tiers slice
}

// priorityRank maps priority names to a numeric rank for comparison.
func priorityRank(p models.TicketPriority) int {
	switch p {
	case models.PriorityLow:
		return 1
	case models.PriorityMedium:
		return 2
	case models.PriorityHigh:
		return 3
	}
	return 0
}

// ---- Service ----

type AlarmService struct {
	alarms    repository.AlarmRepository
	incidents repository.IncidentRepository
	problems  repository.ProblemRepository
	devices   repository.DeviceRepository
	tickets   repository.TicketRepository
	interval  time.Duration
	timeout   time.Duration

	// breachTracker stores the moment each device+metric crossed a tier boundary.
	// Key format: "<deviceID>:<metricType>"
	breachMu      sync.Mutex
	breachTracker map[string]*breachState
}

func newAlarmService(
	alarms repository.AlarmRepository,
	incidents repository.IncidentRepository,
	problems repository.ProblemRepository,
	devices repository.DeviceRepository,
	tickets repository.TicketRepository,
	offlineCheckInterval time.Duration,
	heartbeatTimeout time.Duration,
) *AlarmService {
	return &AlarmService{
		alarms:        alarms,
		incidents:     incidents,
		problems:      problems,
		devices:       devices,
		tickets:       tickets,
		interval:      offlineCheckInterval,
		timeout:       heartbeatTimeout,
		breachTracker: make(map[string]*breachState),
	}
}

// EvaluateMetrics checks each ingested metric against its tiered rule set.
func (s *AlarmService) EvaluateMetrics(deviceID uuid.UUID, _ models.DeviceType, items []IngestMetricItem) {
	for _, item := range items {
		if item.Type == models.MetricTonerLevel {
			s.evaluateToner(deviceID, item)
			continue
		}
		rule, ok := metricRules[item.Type]
		if !ok || len(rule.Tiers) == 0 {
			continue
		}
		s.evaluateMetric(deviceID, item, rule, false)
	}
}

// evaluateMetric handles a single metric reading against a standard (ascending) rule.
// inverse=true means the alarm fires when value is LOW (used for toner).
func (s *AlarmService) evaluateMetric(deviceID uuid.UUID, item IngestMetricItem, rule MetricRule, inverse bool) {
	key := deviceID.String() + ":" + string(item.Type)
	alarmName := fmt.Sprintf("%s threshold exceeded (device:%s)", item.Type, deviceID)
	if inverse {
		alarmName = fmt.Sprintf("%s low (device:%s)", item.Type, deviceID)
	}

	// Find the highest matching tier (worst condition).
	matchedIdx := -1
	for i := len(rule.Tiers) - 1; i >= 0; i-- {
		t := rule.Tiers[i]
		if (!inverse && item.Value >= t.MinValue) || (inverse && item.Value <= t.MinValue) {
			matchedIdx = i
			break
		}
	}

	s.breachMu.Lock()
	defer s.breachMu.Unlock()

	if matchedIdx == -1 {
		// Value is back within normal range: clear state and auto-close any open alarm.
		delete(s.breachTracker, key)
		go s.closeAlarmByName(alarmName)
		return
	}

	currentTier := rule.Tiers[matchedIdx]
	state, tracked := s.breachTracker[key]

	if !tracked || matchedIdx > state.tierIdx {
		// First breach, or escalation to a more severe tier — reset the sustained timer.
		s.breachTracker[key] = &breachState{since: time.Now(), tierIdx: matchedIdx}
		return
	}

	// Same tier: check whether it has been sustained long enough.
	if time.Since(state.since) < currentTier.Duration {
		return // still waiting
	}

	// Sustained breach confirmed — create alarm or escalate existing one.
	go s.createOrEscalate(alarmName, currentTier.Priority, rule.Group)
}

func (s *AlarmService) evaluateToner(deviceID uuid.UUID, item IngestMetricItem) {
	s.evaluateMetric(deviceID, item, tonerRules, true)
}

// createOrEscalate either escalates an existing active alarm (duplicate)
// or creates a new alarm + incident + ticket. If the same alarm name has fired
// before (closed alarm history exists), a Problem is also created or updated.
func (s *AlarmService) createOrEscalate(name string, priority models.TicketPriority, group string) {
	all, err := s.alarms.FindAll(repository.AlarmFilter{Limit: 5000})
	if err != nil {
		log.Printf("alarm evaluation: FindAll: %v", err)
		return
	}

	hasHistory := false
	for i := range all {
		a := &all[i]
		if !strings.EqualFold(a.Alarm, name) {
			continue
		}
		if a.Status != models.StatusClosed {
			// Active duplicate alarm — escalate priority if needed, then stop.
			if priorityRank(priority) > priorityRank(a.Priority) {
				log.Printf("alarm escalation: %s → %s (alarm %s)", a.Priority, priority, a.ID)
				a.Priority = priority
				if err := s.alarms.Update(a); err != nil {
					log.Printf("alarm escalation: update failed: %v", err)
				}
			}
			return
		}
		// Closed alarm with same name — this alarm has recurred before.
		hasHistory = true
	}

	// No active alarm found — create a new one.
	alarmNumber, err := s.alarms.NextAlarmNumber()
	if err != nil {
		log.Printf("alarm evaluation: NextAlarmNumber: %v", err)
		return
	}
	alarm := &models.Alarm{
		AlarmNumber:   alarmNumber,
		Alarm:         name,
		Status:        models.StatusOpen,
		Priority:      priority,
		AssignedGroup: group,
	}
	if err := s.alarms.Create(alarm); err != nil {
		log.Printf("alarm evaluation: failed to create alarm: %v", err)
		return
	}
	alarm.Hyperlink = fmt.Sprintf("/api/v1/alarms/%s", alarm.ID)
	_ = s.alarms.Update(alarm)

	// New unique alarm → create incident + ticket.
	s.createIncidentAndTicket(alarm, hasHistory)
}

// createIncidentAndTicket opens a new Incident for the alarm, creates its Ticket,
// and if the alarm is recurring, creates or updates the associated Problem.
func (s *AlarmService) createIncidentAndTicket(alarm *models.Alarm, isRecurring bool) {
	incidentNumber, err := s.incidents.NextIncidentNumber()
	if err != nil {
		log.Printf("incident creation: NextIncidentNumber: %v", err)
		return
	}

	incident := &models.Incident{
		IncidentNumber: incidentNumber,
		AlarmID:        &alarm.ID,
		Description:    fmt.Sprintf("Alarm triggered: %s", alarm.Alarm),
		Status:         models.StatusOpen,
		Priority:       alarm.Priority,
		AssignedGroup:  alarm.AssignedGroup,
	}
	if err := s.incidents.Create(incident); err != nil {
		log.Printf("incident creation: failed: %v", err)
		return
	}
	incident.Hyperlink = fmt.Sprintf("/api/v1/incidents/%s", incident.ID)
	_ = s.incidents.Update(incident)

	s.createTicket(incident)

	if isRecurring {
		s.createOrUpdateProblem(alarm, incident)
	}
}

// createTicket opens a new Ticket document for the given incident.
func (s *AlarmService) createTicket(incident *models.Incident) {
	ticketNumber, err := s.tickets.NextTicketNumber()
	if err != nil {
		log.Printf("ticket creation: NextTicketNumber: %v", err)
		return
	}
	ticket := &models.Ticket{
		TicketNumber:  ticketNumber,
		IncidentID:    incident.ID,
		Title:         incident.Description,
		Status:        models.StatusOpen,
		Priority:      incident.Priority,
		AssignedGroup: incident.AssignedGroup,
	}
	if err := s.tickets.Create(ticket); err != nil {
		log.Printf("ticket creation: failed: %v", err)
		return
	}
	update := &models.TicketUpdate{
		TicketID:    ticket.ID,
		EventType:   models.EventCreated,
		Description: fmt.Sprintf("Incident %s created with priority %s", incident.IncidentNumber, incident.Priority),
	}
	if err := s.tickets.AddUpdate(update); err != nil {
		log.Printf("ticket creation: AddUpdate: %v", err)
	}
}

// createOrUpdateProblem either creates a new Problem or increments the occurrence
// count on an existing open one for the same alarm name.
func (s *AlarmService) createOrUpdateProblem(alarm *models.Alarm, incident *models.Incident) {
	existing, err := s.problems.FindOpenByAlarmName(alarm.Alarm)
	if err == nil && existing != nil {
		// Update existing open problem.
		existing.OccurrenceCount++
		existing.IncidentID = &incident.ID
		if priorityRank(alarm.Priority) > priorityRank(existing.Priority) {
			existing.Priority = alarm.Priority
		}
		if err := s.problems.Update(existing); err != nil {
			log.Printf("problem update: failed: %v", err)
			return
		}
		s.appendTicketUpdate(incident.ID, models.EventProblemCreated,
			fmt.Sprintf("Linked to existing problem %s (occurrence #%d)", existing.ProblemNumber, existing.OccurrenceCount))
		return
	}

	// Create a new problem.
	problemNumber, err := s.problems.NextProblemNumber()
	if err != nil {
		log.Printf("problem creation: NextProblemNumber: %v", err)
		return
	}
	problem := &models.Problem{
		ProblemNumber:   problemNumber,
		AlarmName:       alarm.Alarm,
		IncidentID:      &incident.ID,
		Description:     fmt.Sprintf("Recurring alarm: %s", alarm.Alarm),
		Status:          models.StatusOpen,
		Priority:        alarm.Priority,
		AssignedGroup:   alarm.AssignedGroup,
		OccurrenceCount: 1,
	}
	if err := s.problems.Create(problem); err != nil {
		log.Printf("problem creation: failed: %v", err)
		return
	}
	problem.Hyperlink = fmt.Sprintf("/api/v1/problems/%s", problem.ID)
	_ = s.problems.Update(problem)

	s.appendTicketUpdate(incident.ID, models.EventProblemCreated,
		fmt.Sprintf("Problem %s created due to recurring alarm", problem.ProblemNumber))
}

// closeAlarmByName closes any open alarm whose name matches, and cascades to
// close the associated incident and its ticket.
func (s *AlarmService) closeAlarmByName(name string) {
	all, err := s.alarms.FindAll(repository.AlarmFilter{Limit: 5000})
	if err != nil {
		return
	}
	now := time.Now()
	for i := range all {
		a := &all[i]
		if a.Status != models.StatusClosed && strings.EqualFold(a.Alarm, name) {
			a.Status = models.StatusClosed
			a.CloseDate = &now
			if err := s.alarms.Update(a); err != nil {
				log.Printf("auto-close alarm: update failed: %v", err)
				continue
			}
			s.closeIncidentsByAlarm(a.ID, now)
		}
	}
}

// closeIncidentsByAlarm closes all open incidents linked to the given alarm
// and cascades to close their tickets.
func (s *AlarmService) closeIncidentsByAlarm(alarmID uuid.UUID, closedAt time.Time) {
	incidents, err := s.incidents.FindByAlarm(alarmID)
	if err != nil {
		log.Printf("cascade close: FindByAlarm(%s): %v", alarmID, err)
		return
	}
	for i := range incidents {
		inc := &incidents[i]
		if inc.Status == models.StatusClosed {
			continue
		}
		inc.Status = models.StatusClosed
		inc.CloseDate = &closedAt
		if err := s.incidents.Update(inc); err != nil {
			log.Printf("cascade close: incident update failed: %v", err)
			continue
		}
		s.syncTicketClosed(inc.ID, closedAt)
	}
}

// syncTicketClosed marks the ticket for the given incident as closed.
func (s *AlarmService) syncTicketClosed(incidentID uuid.UUID, closedAt time.Time) {
	ticket, err := s.tickets.FindByIncidentID(incidentID)
	if err != nil {
		log.Printf("ticket close: FindByIncidentID(%s): %v", incidentID, err)
		return
	}
	ticket.Status = models.StatusClosed
	ticket.CloseDate = &closedAt
	if err := s.tickets.Update(ticket); err != nil {
		log.Printf("ticket close: Update: %v", err)
		return
	}
	u := &models.TicketUpdate{
		TicketID:    ticket.ID,
		EventType:   models.EventClosed,
		Description: "Incident closed",
	}
	if err := s.tickets.AddUpdate(u); err != nil {
		log.Printf("ticket close: AddUpdate: %v", err)
	}
}

// appendTicketUpdate looks up the ticket for the given incident and appends an audit entry.
func (s *AlarmService) appendTicketUpdate(incidentID uuid.UUID, event models.EventType, description string) {
	ticket, err := s.tickets.FindByIncidentID(incidentID)
	if err != nil {
		log.Printf("ticket update: FindByIncidentID(%s): %v", incidentID, err)
		return
	}
	u := &models.TicketUpdate{
		TicketID:    ticket.ID,
		EventType:   event,
		Description: description,
	}
	if err := s.tickets.AddUpdate(u); err != nil {
		log.Printf("ticket update: AddUpdate: %v", err)
	}
}

// CreateOfflineAlarm creates a "Device offline" alarm if one is not already active.
func (s *AlarmService) CreateOfflineAlarm(device *models.Device) {
	s.createOrEscalate(
		fmt.Sprintf("Device offline: %s (%s)", device.Name, device.IPAddress),
		models.PriorityHigh,
		"IT Support",
	)
}

// StartWorker runs a background goroutine that periodically checks for offline devices.
func (s *AlarmService) StartWorker(ctx context.Context) {
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

func (s *AlarmService) checkOfflineDevices() {
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
		s.CreateOfflineAlarm(&deviceCopy)
	}
}

// ---- Alarm management ----

func (s *AlarmService) List(filter repository.AlarmFilter) ([]models.Alarm, error) {
	return s.alarms.FindAll(filter)
}

func (s *AlarmService) Get(id uuid.UUID) (*models.Alarm, error) {
	alarm, err := s.alarms.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return alarm, nil
}

func (s *AlarmService) GetByNumber(number string) (*models.Alarm, error) {
	alarm, err := s.alarms.FindByNumber(number)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return alarm, nil
}

func (s *AlarmService) SetInProgress(id uuid.UUID) error {
	alarm, err := s.Get(id)
	if err != nil {
		return err
	}
	if alarm.Status != models.StatusOpen {
		return errors.New("alarm is not open")
	}
	alarm.Status = models.StatusInProgress
	return s.alarms.Update(alarm)
}

func (s *AlarmService) Close(id uuid.UUID) error {
	alarm, err := s.Get(id)
	if err != nil {
		return err
	}
	if alarm.Status == models.StatusClosed {
		return errors.New("alarm is already closed")
	}
	now := time.Now()
	alarm.Status = models.StatusClosed
	alarm.CloseDate = &now
	if err := s.alarms.Update(alarm); err != nil {
		return err
	}
	s.closeIncidentsByAlarm(alarm.ID, now)
	return nil
}

// ---- Incident management ----

func (s *AlarmService) ListIncidents(filter repository.IncidentFilter) ([]models.Incident, error) {
	return s.incidents.FindAll(filter)
}

func (s *AlarmService) GetIncident(id uuid.UUID) (*models.Incident, error) {
	incident, err := s.incidents.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return incident, nil
}

func (s *AlarmService) GetIncidentByNumber(number string) (*models.Incident, error) {
	incident, err := s.incidents.FindByNumber(number)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return incident, nil
}

func (s *AlarmService) CloseIncident(id uuid.UUID) error {
	incident, err := s.GetIncident(id)
	if err != nil {
		return err
	}
	if incident.Status == models.StatusClosed {
		return errors.New("incident is already closed")
	}
	now := time.Now()
	incident.Status = models.StatusClosed
	incident.CloseDate = &now
	if err := s.incidents.Update(incident); err != nil {
		return err
	}
	s.syncTicketClosed(incident.ID, now)
	return nil
}

// ---- Problem management ----

func (s *AlarmService) ListProblems(filter repository.ProblemFilter) ([]models.Problem, error) {
	return s.problems.FindAll(filter)
}

func (s *AlarmService) GetProblem(id uuid.UUID) (*models.Problem, error) {
	problem, err := s.problems.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return problem, nil
}

func (s *AlarmService) GetProblemByNumber(number string) (*models.Problem, error) {
	problem, err := s.problems.FindByNumber(number)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return problem, nil
}

func (s *AlarmService) CloseProblem(id uuid.UUID) error {
	problem, err := s.GetProblem(id)
	if err != nil {
		return err
	}
	if problem.Status == models.StatusClosed {
		return errors.New("problem is already closed")
	}
	now := time.Now()
	problem.Status = models.StatusClosed
	problem.CloseDate = &now
	return s.problems.Update(problem)
}

// ---- Ticket management ----

func (s *AlarmService) ListTickets(filter repository.TicketFilter) ([]models.Ticket, error) {
	return s.tickets.FindAll(filter)
}

func (s *AlarmService) GetTicket(id uuid.UUID) (*models.Ticket, error) {
	ticket, err := s.tickets.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return ticket, nil
}

func (s *AlarmService) GetTicketByNumber(number string) (*models.Ticket, error) {
	ticket, err := s.tickets.FindByNumber(number)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return ticket, nil
}
