.PHONY: run build test test-monitor test-all tidy docker-up docker-down

run:
	go run ./cmd/server

build:
	go build -o bin/server ./cmd/server

tidy:
	go mod tidy

test:
	go test ./... -v

test-monitor:
	docker cp monitor/monitor.py sentrynet-monitor-1:/app/monitor.py
	docker exec sentrynet-monitor-1 python -m pytest test_integration.py -v

test-all: test test-monitor

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f backend
