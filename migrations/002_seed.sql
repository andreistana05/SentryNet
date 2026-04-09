-- SentryNet Demo Seed
-- Clears application data (preserves alert_rules and alerts from Module 4)
-- and inserts representative demo records that match the current backend model.

-- -------------------------------------------------------------------------
-- 1. Truncate application tables (cascade to metrics, ticket_updates)
-- -------------------------------------------------------------------------
TRUNCATE TABLE ticket_updates  CASCADE;
TRUNCATE TABLE tickets         CASCADE;
TRUNCATE TABLE problems        CASCADE;
TRUNCATE TABLE incidents       CASCADE;
TRUNCATE TABLE alarms          CASCADE;
TRUNCATE TABLE metrics         CASCADE;
TRUNCATE TABLE devices         CASCADE;
TRUNCATE TABLE users           CASCADE;

-- -------------------------------------------------------------------------
-- 2. Users  (passwords are bcrypt of "Password1!")
-- -------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'admin',
   'admin@sentrynet.local',
   '$2a$10$Y3Zl7Lv9kG0p4mH8rN5wCe2sQ6xT1bJ/WuKfRdOiMzXcPqVhEyAnu',
   'admin',
   NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002',
   'operator',
   'ops@sentrynet.local',
   '$2a$10$Y3Zl7Lv9kG0p4mH8rN5wCe2sQ6xT1bJ/WuKfRdOiMzXcPqVhEyAnu',
   'operator',
   NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003',
   'viewer',
   'viewer@sentrynet.local',
   '$2a$10$Y3Zl7Lv9kG0p4mH8rN5wCe2sQ6xT1bJ/WuKfRdOiMzXcPqVhEyAnu',
   'viewer',
   NOW(), NOW());

-- -------------------------------------------------------------------------
-- 3. Devices
-- -------------------------------------------------------------------------
INSERT INTO devices (id, name, type, hostname, ip_address, status, description, location, last_seen, created_at, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000001',
   'Core Router',       'router',      'core-router-01',   '10.0.0.1',   'online',
   'Primary WAN uplink router', 'Server Room A', NOW() - INTERVAL '30 seconds', NOW(), NOW()),

  ('10000000-0000-0000-0000-000000000002',
   'Distribution Switch', 'switch',    'dist-switch-01',   '10.0.0.2',   'online',
   'Floor distribution switch', 'IDF Closet 2', NOW() - INTERVAL '45 seconds', NOW(), NOW()),

  ('10000000-0000-0000-0000-000000000003',
   'App Server 01',     'server',      'app-server-01',    '10.0.1.10',  'online',
   'Primary application server', 'Server Room A', NOW() - INTERVAL '1 minute', NOW(), NOW()),

  ('10000000-0000-0000-0000-000000000004',
   'DB Server 01',      'server',      'db-server-01',     '10.0.1.11',  'online',
   'PostgreSQL database server', 'Server Room A', NOW() - INTERVAL '2 minutes', NOW(), NOW()),

  ('10000000-0000-0000-0000-000000000005',
   'Backup Server',     'server',      'backup-srv-01',    '10.0.1.12',  'offline',
   'Nightly backup server', 'Server Room B', NOW() - INTERVAL '2 hours', NOW(), NOW()),

  ('10000000-0000-0000-0000-000000000006',
   'Dev Workstation 1', 'workstation', 'dev-ws-01',        '10.0.2.20',  'online',
   'Developer workstation - NOC team', 'Office Floor 1', NOW() - INTERVAL '3 minutes', NOW(), NOW()),

  ('10000000-0000-0000-0000-000000000007',
   'Dev Workstation 2', 'workstation', 'dev-ws-02',        '10.0.2.21',  'unknown',
   'Developer workstation - Ops team', 'Office Floor 1', NOW() - INTERVAL '6 hours', NOW(), NOW()),

  ('10000000-0000-0000-0000-000000000008',
   'Office Printer',    'printer',     'printer-01',       '10.0.3.50',  'online',
   'HP LaserJet - main office', 'Office Floor 2', NOW() - INTERVAL '10 minutes', NOW(), NOW());

-- -------------------------------------------------------------------------
-- 4. Metrics (latest readings per device)
-- -------------------------------------------------------------------------
INSERT INTO metrics (id, device_id, type, value, unit, timestamp) VALUES
  -- Core Router
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'cpu_usage',    42.5, '%',  NOW() - INTERVAL '30 seconds'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'ram_usage',    61.0, '%',  NOW() - INTERVAL '30 seconds'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'latency',      18.0, 'ms', NOW() - INTERVAL '30 seconds'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'temperature',  52.0, 'C',  NOW() - INTERVAL '30 seconds'),
  -- Distribution Switch
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', 'cpu_usage',    28.0, '%',  NOW() - INTERVAL '45 seconds'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', 'ram_usage',    44.0, '%',  NOW() - INTERVAL '45 seconds'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', 'latency',       8.0, 'ms', NOW() - INTERVAL '45 seconds'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', 'temperature',  45.0, 'C',  NOW() - INTERVAL '45 seconds'),
  -- App Server 01
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', 'cpu_usage',    87.3, '%',  NOW() - INTERVAL '1 minute'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', 'ram_usage',    91.0, '%',  NOW() - INTERVAL '1 minute'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', 'disk_usage',   74.0, '%',  NOW() - INTERVAL '1 minute'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', 'temperature',  78.0, 'C',  NOW() - INTERVAL '1 minute'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000003', 'latency',     240.0, 'ms', NOW() - INTERVAL '1 minute'),
  -- DB Server 01
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000004', 'cpu_usage',    55.0, '%',  NOW() - INTERVAL '2 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000004', 'ram_usage',    82.0, '%',  NOW() - INTERVAL '2 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000004', 'disk_usage',   89.5, '%',  NOW() - INTERVAL '2 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000004', 'temperature',  65.0, 'C',  NOW() - INTERVAL '2 minutes'),
  -- Dev Workstation 1
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000006', 'cpu_usage',    34.0, '%',  NOW() - INTERVAL '3 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000006', 'ram_usage',    58.0, '%',  NOW() - INTERVAL '3 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000006', 'disk_usage',   62.0, '%',  NOW() - INTERVAL '3 minutes'),
  -- Office Printer
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000008', 'toner_level',  15.0, '%',  NOW() - INTERVAL '10 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000008', 'drum_health',  22.0, '%',  NOW() - INTERVAL '10 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000008', 'paper_level',  40.0, '%',  NOW() - INTERVAL '10 minutes'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000008', 'queue_depth',   3.0, 'jobs', NOW() - INTERVAL '10 minutes');

-- -------------------------------------------------------------------------
-- 5. Alarms
-- -------------------------------------------------------------------------
INSERT INTO alarms (id, alarm_number, alarm, hyperlink, status, submit_date, last_modified_date, priority, assigned_group, assigned_person) VALUES
  ('20000000-0000-0000-0000-000000000001',
   'ALM0001', 'High CPU usage on App Server 01 — 87% for 8+ minutes',
   '', 'Open', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes',
   'High', 'IT Support', ''),

  ('20000000-0000-0000-0000-000000000002',
   'ALM0002', 'High RAM usage on App Server 01 — 91% for 6 minutes',
   '', 'In Progress', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes',
   'High', 'IT Support', 'Alex Ionescu'),

  ('20000000-0000-0000-0000-000000000003',
   'ALM0003', 'Disk usage critical on DB Server 01 — 89.5%',
   '', 'Open', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes',
   'High', 'DBA Team', ''),

  ('20000000-0000-0000-0000-000000000004',
   'ALM0004', 'High RAM usage on DB Server 01 — 82% for 12 minutes',
   '', 'Open', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes',
   'Medium', 'DBA Team', ''),

  ('20000000-0000-0000-0000-000000000005',
   'ALM0005', 'Backup Server offline — heartbeat timeout',
   '', 'In Progress', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour',
   'High', 'IT Support', 'Maria Popescu'),

  ('20000000-0000-0000-0000-000000000006',
   'ALM0006', 'Toner level critical on Office Printer — 15%',
   '', 'Open', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes',
   'Low', 'Facilities', ''),

  ('20000000-0000-0000-0000-000000000007',
   'ALM0007', 'Elevated latency on App Server 01 — 240ms response time',
   '', 'Open', NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '8 minutes',
   'Medium', 'IT Support', ''),

  ('20000000-0000-0000-0000-000000000008',
   'ALM0008', 'Dev Workstation 2 unreachable — no heartbeat for 6 hours',
   '', 'Closed', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '1 hour',
   'Low', 'IT Support', 'Ion Georgescu');

-- -------------------------------------------------------------------------
-- 6. Incidents
-- -------------------------------------------------------------------------
INSERT INTO incidents (id, incident_number, alarm_id, hyperlink, description, status, submit_date, last_modified_date, priority, assigned_group, assigned_person) VALUES
  ('30000000-0000-0000-0000-000000000001',
   'INC0001', '20000000-0000-0000-0000-000000000001', '',
   'App Server 01 CPU has been above 85% for over 8 minutes. Service degradation observed on the application tier. Requires immediate investigation.',
   'Open', NOW() - INTERVAL '14 minutes', NOW() - INTERVAL '14 minutes',
   'High', 'IT Support', ''),

  ('30000000-0000-0000-0000-000000000002',
   'INC0002', '20000000-0000-0000-0000-000000000002', '',
   'App Server 01 RAM at 91%. Memory pressure is causing application slowdown. Possible memory leak in web service process.',
   'Open', NOW() - INTERVAL '9 minutes', NOW() - INTERVAL '4 minutes',
   'High', 'IT Support', 'Alex Ionescu'),

  ('30000000-0000-0000-0000-000000000003',
   'INC0003', '20000000-0000-0000-0000-000000000003', '',
   'DB Server 01 disk at 89.5%. PostgreSQL write performance degraded. Disk full risk within 48h at current growth rate.',
   'Open', NOW() - INTERVAL '29 minutes', NOW() - INTERVAL '10 minutes',
   'High', 'DBA Team', 'Maria Popescu'),

  ('30000000-0000-0000-0000-000000000004',
   'INC0004', '20000000-0000-0000-0000-000000000005', '',
   'Backup Server has been offline for over 2 hours. Last successful backup was 26 hours ago. Data protection SLA at risk.',
   'Open', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes',
   'High', 'IT Support', 'Maria Popescu');

-- -------------------------------------------------------------------------
-- 7. Tickets  (one per incident; alarm_id is nullable)
-- -------------------------------------------------------------------------
INSERT INTO tickets (id, ticket_number, alarm_id, incident_id, title, status, priority, assigned_group, assigned_person, submit_date, last_modified_date) VALUES
  ('40000000-0000-0000-0000-000000000001',
   'TKT0001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   'Investigate CPU spike on App Server 01',
   'Open', 'High', 'IT Support', 'Alex Ionescu',
   NOW() - INTERVAL '14 minutes', NOW() - INTERVAL '14 minutes'),

  ('40000000-0000-0000-0000-000000000002',
   'TKT0002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
   'Resolve memory pressure — App Server 01',
   'In Progress', 'High', 'IT Support', 'Alex Ionescu',
   NOW() - INTERVAL '9 minutes', NOW() - INTERVAL '4 minutes'),

  ('40000000-0000-0000-0000-000000000003',
   'TKT0003', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   'Expand disk capacity — DB Server 01',
   'Open', 'High', 'DBA Team', 'Maria Popescu',
   NOW() - INTERVAL '29 minutes', NOW() - INTERVAL '10 minutes'),

  ('40000000-0000-0000-0000-000000000004',
   'TKT0004', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004',
   'Restore and verify Backup Server',
   'In Progress', 'High', 'IT Support', 'Ion Georgescu',
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '20 minutes');

-- -------------------------------------------------------------------------
-- 8. Ticket updates (audit trail)
-- -------------------------------------------------------------------------
INSERT INTO ticket_updates (id, ticket_id, event_type, description, timestamp) VALUES
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000001',
   'created', 'Ticket created from INC0001 - CPU threshold breach on App Server 01.',
   NOW() - INTERVAL '14 minutes'),

  (gen_random_uuid(), '40000000-0000-0000-0000-000000000002',
   'created', 'Ticket created from INC0002 - RAM pressure on App Server 01.',
   NOW() - INTERVAL '9 minutes'),
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000002',
   'status_changed', 'Alex Ionescu picked up the ticket. Identified web service process holding 4.2 GB. Restart scheduled after traffic drops.',
   NOW() - INTERVAL '4 minutes'),

  (gen_random_uuid(), '40000000-0000-0000-0000-000000000003',
   'created', 'Ticket created from INC0003 - DB disk at 89.5%.',
   NOW() - INTERVAL '29 minutes'),
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000003',
   'status_changed', 'Maria Popescu: old WAL segments identified as main growth source. Archiving in progress. Storage request submitted.',
   NOW() - INTERVAL '10 minutes'),

  (gen_random_uuid(), '40000000-0000-0000-0000-000000000004',
   'created', 'Ticket created from INC0004 - Backup Server offline.',
   NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000004',
   'status_changed', 'Ion Georgescu: physical inspection shows power supply failure. Replacement unit ordered. ETA 4h.',
   NOW() - INTERVAL '20 minutes');

-- -------------------------------------------------------------------------
-- 9. Problems (recurring issues elevated to root-cause analysis)
-- -------------------------------------------------------------------------
INSERT INTO problems (id, problem_number, alarm_name, incident_id, hyperlink, description, status, submit_date, last_modified_date, priority, assigned_group, assigned_person, occurrence_count) VALUES
  ('50000000-0000-0000-0000-000000000001',
   'PRB0001', 'High CPU usage on App Server 01',
   '30000000-0000-0000-0000-000000000001', '',
   'App Server 01 CPU spikes above 85% have occurred 4 times in the past 7 days. Suspected root cause: unoptimised nightly batch job competing with daytime traffic. Root cause analysis underway.',
   'Open', NOW() - INTERVAL '3 days', NOW() - INTERVAL '14 minutes',
   'High', 'IT Support', 'Alex Ionescu', 4),

  ('50000000-0000-0000-0000-000000000002',
   'PRB0002', 'Backup Server offline',
   '30000000-0000-0000-0000-000000000004', '',
   'Backup Server has gone offline twice in 30 days due to PSU failures. Hardware is out of warranty. Replacement or cloud-backup migration proposal required.',
   'Open', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 hours',
   'Medium', 'IT Support', 'Maria Popescu', 2);
