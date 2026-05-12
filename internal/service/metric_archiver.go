package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"sentrynet/backend/internal/repository"
)

// MetricArchiverService aggregates raw metrics older than RetentionPeriod into
// daily summaries stored in metric_aggregates, then deletes the originals.
type MetricArchiverService struct {
	metrics         repository.MetricRepository
	aggregates      repository.MetricAggregateRepository
	retentionPeriod time.Duration
	runInterval     time.Duration
}

func newMetricArchiverService(
	metrics repository.MetricRepository,
	aggregates repository.MetricAggregateRepository,
	retentionPeriod time.Duration,
	runInterval time.Duration,
) *MetricArchiverService {
	return &MetricArchiverService{
		metrics:         metrics,
		aggregates:      aggregates,
		retentionPeriod: retentionPeriod,
		runInterval:     runInterval,
	}
}

// StartWorker launches the archiver as a background goroutine.
// It runs once at startup, then repeats at runInterval until ctx is cancelled.
func (s *MetricArchiverService) StartWorker(ctx context.Context) {
	go func() {
		s.runOnce()
		ticker := time.NewTicker(s.runInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.runOnce()
			}
		}
	}()
}

func (s *MetricArchiverService) runOnce() {
	cutoff := time.Now().UTC().Add(-s.retentionPeriod)
	archived, deleted, err := s.Archive(cutoff)
	if err != nil {
		log.Printf("metric archiver: %v", err)
		return
	}
	if archived > 0 || deleted > 0 {
		log.Printf("metric archiver: aggregated %d daily buckets, deleted %d raw metrics (cutoff %s)",
			archived, deleted, cutoff.Format("2006-01-02"))
	}
}

// Archive aggregates raw metrics older than cutoff into daily summaries and
// then deletes them. Returns the number of aggregate rows inserted and raw
// rows deleted. Safe to call multiple times — duplicate aggregates are skipped.
func (s *MetricArchiverService) Archive(cutoff time.Time) (archived, deleted int64, err error) {
	archived, err = s.aggregates.InsertFromMetrics(cutoff)
	if err != nil {
		return 0, 0, fmt.Errorf("insert aggregates: %w", err)
	}
	deleted, err = s.metrics.DeleteBefore(cutoff)
	if err != nil {
		return archived, 0, fmt.Errorf("delete raw metrics: %w", err)
	}
	return archived, deleted, nil
}
