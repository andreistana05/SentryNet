package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                       string
	DatabaseURL                string
	RedisURL                   string
	JWTSecret                  string
	JWTExpiry                  time.Duration
	IngestAPIKey               string
	Environment                string
	HeartbeatTimeout           time.Duration
	OfflineCheckInterval       time.Duration
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/sentrynet?sslmode=disable"),
		RedisURL:             getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:            getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiry:            getDurationHours("JWT_EXPIRY_HOURS", 24),
		IngestAPIKey:         getEnv("INGEST_API_KEY", "change-me-ingest-key"),
		Environment:          getEnv("ENVIRONMENT", "development"),
		HeartbeatTimeout:     getDurationMinutes("HEARTBEAT_TIMEOUT_MINUTES", 5),
		OfflineCheckInterval: getDurationSeconds("OFFLINE_CHECK_INTERVAL_SECONDS", 60),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDurationHours(key string, defaultHours int) time.Duration {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return time.Duration(n) * time.Hour
		}
	}
	return time.Duration(defaultHours) * time.Hour
}

func getDurationMinutes(key string, defaultMinutes int) time.Duration {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return time.Duration(n) * time.Minute
		}
	}
	return time.Duration(defaultMinutes) * time.Minute
}

func getDurationSeconds(key string, defaultSeconds int) time.Duration {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return time.Duration(n) * time.Second
		}
	}
	return time.Duration(defaultSeconds) * time.Second
}
