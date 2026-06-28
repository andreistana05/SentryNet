# SentryNet

SentryNet is a network operations dashboard for tracking devices, metrics, alarms, incidents, problems, tickets, groups, and employees. The project combines a Go API, PostgreSQL, Redis, a React dashboard, a Python host agent, and a Python network monitor.

## What is included

- **Backend API**: Go + Gin service under `cmd/`, `internal/`, and `pkg/`
- **Dashboard**: React + Vite frontend in `dashboard-frontend/`
- **Agent**: Python host collector and GUI in `agent/`
- **Monitor**: Python SNMP/network discovery worker in `monitor/`
- **Storage**: PostgreSQL migrations in `migrations/`
- **Cache/work queues**: Redis
- **Local orchestration**: Docker Compose

## Architecture

```text
Dashboard browser -> http://localhost:3000
                         |
                         v
Backend API -------> http://localhost:9000/api/v1
   |                         ^
   |                         |
PostgreSQL + Redis      Agent / Monitor ingest
```

The backend listens on port `8080` inside the container and is published to the host as `http://localhost:9000`. The dashboard is published as `http://localhost:3000`.

## Requirements

- Docker and Docker Compose
- Go 1.23+
- Node.js and npm
- Python 3.11+ for the agent and monitor scripts

Docker Compose is the easiest way to run the full stack locally.

## Quick start

1. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Update `.env` values for local development. At minimum, set strong values before sharing or deploying:

   ```env
   JWT_SECRET=change-me-in-production-use-a-long-random-string
   INGEST_API_KEY=change-me-ingest-key
   ```

3. Start the stack:

   ```powershell
   docker compose up -d
   ```

4. Open the dashboard:

   ```text
   http://localhost:3000
   ```

5. Backend API base URL:

   ```text
   http://localhost:9000/api/v1
   ```

## Useful commands

```powershell
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Follow backend logs
docker compose logs -f backend

# Run backend locally
go run ./cmd/server

# Run Go tests
go test ./... -v
```

The Makefile also provides shortcuts:

```powershell
make docker-up
make docker-down
make docker-logs
make test
```

## Frontend development

```powershell
cd dashboard-frontend
npm install
npm run dev
```

Common frontend commands:

```powershell
npm run build
npm run lint
npm run test
```

When the frontend is run outside Docker, configure the API base URL with:

```env
VITE_API_BASE_URL=http://localhost:9000/api/v1
```

## Agent

The Python agent collects host/device information and sends metrics and heartbeats to the ingest API.

```powershell
cd agent
pip install -r requirements.txt
python main.py
```

For the Windows-host Agent GUI, point the backend URL at:

```text
http://127.0.0.1:9000
```

The container-internal backend port is `8080`; host-side tools should use port `9000`. The agent ingest key must match `INGEST_API_KEY` from `.env`.

## Network monitor

The monitor can run through Docker Compose or directly during development.

```powershell
cd monitor
pip install -r requirements.txt
python monitor.py
```

Compose sets these monitor defaults:

```env
BACKEND_URL=http://backend:8080
NETWORK_RANGE=192.168.1.0/24
GATEWAY_IP=192.168.1.1
```

Adjust them in `docker-compose.yml` or your environment for your network.

## API notes

All API routes are prefixed with:

```text
/api/v1
```

Public auth routes:

- `POST /auth/register`
- `POST /auth/login`

Agent and monitor ingest routes use `X-API-Key`:

- `GET /ingest/devices`
- `POST /ingest/metrics`
- `POST /ingest/heartbeat`
- `POST /ingest/event`

Dashboard and management routes use JWT Bearer authentication.

## Environment variables

See `.env.example` for the full list. Important values include:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_EXPIRY_HOURS`
- `INGEST_API_KEY`
- `HEARTBEAT_TIMEOUT_MINUTES`
- `OFFLINE_CHECK_INTERVAL_SECONDS`
- `NETWORK_RANGE`
- `DISCOVERY_INTERVAL`

## Project layout

```text
.
|-- agent/                 Python host agent and GUI
|-- cmd/server/            Go API entry point
|-- dashboard-frontend/    React dashboard
|-- internal/              Backend handlers, services, repositories, middleware
|-- migrations/            PostgreSQL schema and seed data
|-- monitor/               Network monitor and SNMP collector
|-- pkg/                   Shared backend packages
|-- docker-compose.yml     Local full-stack orchestration
|-- Dockerfile             Backend container image
|-- Makefile               Development shortcuts
```

## License

No license file is currently included.
