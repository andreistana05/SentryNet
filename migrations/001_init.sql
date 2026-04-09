-- This file documents the schema created by GORM AutoMigrate.
-- You can run this manually if you prefer migrations over AutoMigrate.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(100) UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'viewer',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(20)  NOT NULL,
    hostname    VARCHAR(255),
    ip_address  VARCHAR(45)  UNIQUE NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'unknown',
    description VARCHAR(500),
    location    VARCHAR(255),
    last_seen   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_hostname ON devices(hostname);
CREATE INDEX IF NOT EXISTS idx_devices_status   ON devices(status);

CREATE TABLE IF NOT EXISTS metrics (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id  UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    value      DOUBLE PRECISION NOT NULL,
    unit       VARCHAR(20),
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_device_id ON metrics(device_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type      ON metrics(type);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC);

-- alarms: one record per alarm event.
-- When the same alarm repeats itself, an incident is created referencing it.
CREATE TABLE IF NOT EXISTS alarms (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alarm              VARCHAR(255) NOT NULL,
    hyperlink          VARCHAR(500),
    status             VARCHAR(20)  NOT NULL DEFAULT 'Open',
    submit_date        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_modified_date TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    close_date         TIMESTAMPTZ,
    priority           VARCHAR(10)  NOT NULL,
    assigned_group     VARCHAR(255),
    assigned_person    VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_alarms_status   ON alarms(status);
CREATE INDEX IF NOT EXISTS idx_alarms_priority ON alarms(priority);

-- incidents: created when an alarm repeats itself.
CREATE TABLE IF NOT EXISTS incidents (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_number    VARCHAR(20)  NOT NULL UNIQUE,
    alarm_id           UUID         REFERENCES alarms(id) ON DELETE SET NULL,
    hyperlink          VARCHAR(500),
    description        VARCHAR(1000) NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'Open',
    submit_date        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_modified_date TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    close_date         TIMESTAMPTZ,
    priority           VARCHAR(10)  NOT NULL,
    assigned_group     VARCHAR(255),
    assigned_person    VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_incidents_alarm_id ON incidents(alarm_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents(status);

-- tickets: one per incident, serves as the living document for an incident's lifecycle.
-- alarm_id is nullable (populated by AutoMigrate legacy; use incident_id as the canonical FK).
CREATE TABLE IF NOT EXISTS tickets (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number      VARCHAR(20)   NOT NULL UNIQUE,
    alarm_id           UUID          REFERENCES alarms(id) ON DELETE SET NULL,
    incident_id        UUID          NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
    title              VARCHAR(255)  NOT NULL,
    status             VARCHAR(20)   NOT NULL DEFAULT 'Open',
    priority           VARCHAR(10)   NOT NULL,
    assigned_group     VARCHAR(255),
    assigned_person    VARCHAR(255),
    submit_date        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_modified_date TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    close_date         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);

-- ticket_updates: append-only audit log for every state change on a ticket.
CREATE TABLE IF NOT EXISTS ticket_updates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_type  VARCHAR(30)  NOT NULL,
    description VARCHAR(500) NOT NULL,
    timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_updates_ticket_id ON ticket_updates(ticket_id);
