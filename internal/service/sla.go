package service

import (
	"context"
	"log"
	"time"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
)

// SLAService monitors open tickets and logs a warning whenever one has been
// open longer than the configured threshold without being closed or resolved.
type SLAService struct {
	tickets      repository.TicketRepository
	slaThreshold time.Duration
}

func newSLAService(tickets repository.TicketRepository, slaThreshold time.Duration) *SLAService {
	return &SLAService{
		tickets:      tickets,
		slaThreshold: slaThreshold,
	}
}

// StartWorker launches the SLA checker as a background goroutine.
// It runs once at startup, then repeats every slaThreshold until ctx is cancelled.
func (s *SLAService) StartWorker(ctx context.Context) {
	go func() {
		s.checkOnce()
		ticker := time.NewTicker(s.slaThreshold)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.checkOnce()
			}
		}
	}()
}

func (s *SLAService) checkOnce() {
	breached, err := s.CheckBreaches()
	if err != nil {
		log.Printf("sla: check failed: %v", err)
		return
	}
	for _, t := range breached {
		age := time.Since(t.SubmitDate).Round(time.Minute)
		log.Printf("sla: ticket %s breached SLA (open for %s, threshold %s)",
			t.TicketNumber, age, s.slaThreshold)
	}
}

// CheckBreaches returns all tickets that are still open and have exceeded the SLA threshold.
func (s *SLAService) CheckBreaches() ([]models.Ticket, error) {
	all, err := s.tickets.FindAll(repository.TicketFilter{})
	if err != nil {
		return nil, err
	}

	cutoff := time.Now().Add(-s.slaThreshold)
	var breached []models.Ticket
	for _, t := range all {
		if t.CloseDate != nil {
			continue
		}
		if t.Status == models.StatusClosedTicket || t.Status == models.StatusResolved {
			continue
		}
		if t.SubmitDate.Before(cutoff) {
			breached = append(breached, t)
		}
	}
	return breached, nil
}
