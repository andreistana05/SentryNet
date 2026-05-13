// Package main is the SentryNet backend server entry point.
// It initialises all dependencies (Postgres, Redis), wires up the service and
// handler layers, launches the background alarm worker, and runs the HTTP server
// with graceful SIGINT/SIGTERM shutdown.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sentrynet/backend/internal/config"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/internal/router"
	"sentrynet/backend/internal/service"
	"sentrynet/backend/pkg/cache"
)

func main() {
	cfg := config.Load()

	db, err := repository.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}

	if err := repository.Migrate(db); err != nil {
		log.Fatalf("migration: %v", err)
	}

	redis, err := cache.NewRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}

	repos := repository.NewRepositories(db)
	services := service.NewServices(repos, redis, cfg)

	// Start background workers.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	services.Alarm.StartWorker(ctx)
	services.MetricArchiver.StartWorker(ctx)

	r := router.New(services, cfg)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("InfraPulse Backend starting on :%s (env=%s)", cfg.Port, cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down gracefully...")
	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("Server stopped")
}
