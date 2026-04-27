// Package cache provides a Redis client factory for the SentryNet backend.
package cache

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// NewRedis parses the given Redis URL, opens a client, and pings the server to
// verify connectivity before returning.
func NewRedis(redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis URL: %w", err)
	}

	client := redis.NewClient(opts)

	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return client, nil
}
