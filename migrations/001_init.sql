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

CREATE INDEX IF NOT EXISTS idx_devices_hostname   ON devices(hostname);
CREATE INDEX IF NOT EXISTS idx_devices_status     ON devices(status);

CREATE TABLE IF NOT EXISTS metrics (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id  UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    value      DOUBLE PRECISION NOT NULL,
    unit       VARCHAR(20),
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_device_id  ON metrics(device_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type       ON metrics(type);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp  ON metrics(timestamp DESC);

CREATE TABLE IF NOT EXISTS alert_rules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    device_id   UUID         REFERENCES devices(id) ON DELETE CASCADE,
    device_type VARCHAR(20),
    metric_type VARCHAR(50)  NOT NULL,
    operator    VARCHAR(10)  NOT NULL,
    threshold   DOUBLE PRECISION NOT NULL,
    severity    VARCHAR(20)  NOT NULL,
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_device_id ON alert_rules(device_id);

CREATE TABLE IF NOT EXISTS alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    rule_id         UUID        REFERENCES alert_rules(id) ON DELETE SET NULL,
    severity        VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    title           VARCHAR(255) NOT NULL,
    message         VARCHAR(1000) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_rule_id   ON alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status    ON alerts(status);
