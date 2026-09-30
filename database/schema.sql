PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Drop dependent views
DROP VIEW IF EXISTS v_event_capacities;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_check_event_capacity_before_insert;
DROP TRIGGER IF EXISTS trg_check_event_capacity_before_update;
DROP TRIGGER IF EXISTS trg_check_event_venue_capacity_before_insert;
DROP TRIGGER IF EXISTS trg_check_event_venue_capacity_before_update;
DROP TRIGGER IF EXISTS trg_check_event_organizer_role_before_insert;
DROP TRIGGER IF EXISTS trg_check_event_organizer_role_before_update;
DROP TRIGGER IF EXISTS trg_check_venue_schedule_conflict_before_insert;
DROP TRIGGER IF EXISTS trg_check_venue_schedule_conflict_before_update;
DROP TRIGGER IF EXISTS trg_users_updated_at;
DROP TRIGGER IF EXISTS trg_events_updated_at;
DROP TRIGGER IF EXISTS trg_registrations_updated_at;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS event_categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS roles;

-- 1. Roles Lookup Table
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT uq_roles_name UNIQUE (name),
    CONSTRAINT chk_roles_name CHECK (name IN ('STUDENT', 'ADMIN'))
);

-- 2. Departments Lookup Table
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT uq_departments_code UNIQUE (code),
    CONSTRAINT uq_departments_name UNIQUE (name),
    CONSTRAINT chk_departments_code_len CHECK (LENGTH(code) >= 2)
);

-- 3. Users Entity Table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    department_id INTEGER,
    student_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_student_id UNIQUE (student_id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_users_email_format CHECK (email LIKE '%_@_%._%' AND LENGTH(email) <= 255)
);

-- 4. Event Categories Table
CREATE TABLE event_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT uq_event_categories_name UNIQUE (name)
);

-- 5. Venues Table
CREATE TABLE venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    building TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT uq_venues_name UNIQUE (name),
    CONSTRAINT chk_venues_capacity CHECK (capacity > 0)
);

-- 6. Events Entity Table
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL,
    venue_id INTEGER NOT NULL,
    organizer_id INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES event_categories (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_events_capacity CHECK (capacity > 0),
    CONSTRAINT chk_events_date_order CHECK (end_at > start_at)
);

-- 7. Registrations Associative Table
CREATE TABLE registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    registered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT uq_registrations_user_event UNIQUE (user_id, event_id),
    CONSTRAINT fk_registrations_event FOREIGN KEY (event_id) REFERENCES events (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_registrations_user FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_registrations_status CHECK (status IN ('CONFIRMED', 'CANCELLED', 'ATTENDED'))
);

-- =========================================================================
-- Non-Clustered Indexes on Foreign Keys & Query Hotspots
-- =========================================================================
CREATE INDEX idx_users_role_id ON users (role_id);
CREATE INDEX idx_users_department_id ON users (department_id);
CREATE INDEX idx_events_category_id ON events (category_id);
CREATE INDEX idx_events_venue_id ON events (venue_id);
CREATE INDEX idx_events_organizer_id ON events (organizer_id);
CREATE INDEX idx_events_start_at ON events (start_at);
CREATE INDEX idx_registrations_event_id ON registrations (event_id);
CREATE INDEX idx_registrations_user_id ON registrations (user_id);
CREATE INDEX idx_registrations_status ON registrations (status);

-- =========================================================================
-- Business Logic Triggers
-- =========================================================================

-- 1. Registration Capacity Check on INSERT
CREATE TRIGGER trg_check_event_capacity_before_insert
BEFORE INSERT ON registrations
FOR EACH ROW
WHEN NEW.status != 'CANCELLED'
BEGIN
    SELECT
        CASE
            WHEN (
                SELECT COUNT(*)
                FROM registrations
                WHERE event_id = NEW.event_id
                  AND status != 'CANCELLED'
            ) >= (
                SELECT capacity
                FROM events
                WHERE id = NEW.event_id
            )
            THEN RAISE(ABORT, 'Event registration failed: Event is at full capacity.')
        END;
END;

-- 2. Registration Capacity Check on UPDATE
CREATE TRIGGER trg_check_event_capacity_before_update
BEFORE UPDATE OF status, event_id ON registrations
FOR EACH ROW
WHEN NEW.status != 'CANCELLED' AND (OLD.status = 'CANCELLED' OR OLD.event_id != NEW.event_id)
BEGIN
    SELECT
        CASE
            WHEN (
                SELECT COUNT(*)
                FROM registrations
                WHERE event_id = NEW.event_id
                  AND status != 'CANCELLED'
                  AND id != NEW.id
            ) >= (
                SELECT capacity
                FROM events
                WHERE id = NEW.event_id
            )
            THEN RAISE(ABORT, 'Event registration update failed: Event is at full capacity.')
        END;
END;

-- 3. Event Capacity vs Venue Physical Capacity on INSERT
CREATE TRIGGER trg_check_event_venue_capacity_before_insert
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN NEW.capacity > (
                SELECT capacity FROM venues WHERE id = NEW.venue_id
            )
            THEN RAISE(ABORT, 'Event capacity cannot exceed the maximum physical venue capacity.')
        END;
END;

-- 4. Event Capacity vs Venue Physical Capacity on UPDATE
CREATE TRIGGER trg_check_event_venue_capacity_before_update
BEFORE UPDATE OF capacity, venue_id ON events
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN NEW.capacity > (
                SELECT capacity FROM venues WHERE id = NEW.venue_id
            )
            THEN RAISE(ABORT, 'Event capacity cannot exceed the maximum physical venue capacity.')
        END;
END;

-- 5. Event Organizer Must Have ADMIN Role on INSERT
CREATE TRIGGER trg_check_event_organizer_role_before_insert
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN (
                SELECT r.name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE u.id = NEW.organizer_id
            ) != 'ADMIN'
            THEN RAISE(ABORT, 'Event organizer must have an ADMIN role.')
        END;
END;

-- 6. Event Organizer Must Have ADMIN Role on UPDATE
CREATE TRIGGER trg_check_event_organizer_role_before_update
BEFORE UPDATE OF organizer_id ON events
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN (
                SELECT r.name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE u.id = NEW.organizer_id
            ) != 'ADMIN'
            THEN RAISE(ABORT, 'Event organizer must have an ADMIN role.')
        END;
END;

-- 7. Venue Schedule Overlap Prevention on INSERT
CREATE TRIGGER trg_check_venue_schedule_conflict_before_insert
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1 FROM events
                WHERE venue_id = NEW.venue_id
                  AND (NEW.start_at < end_at AND NEW.end_at > start_at)
            )
            THEN RAISE(ABORT, 'Venue schedule conflict: Another event is already booked during this time range.')
        END;
END;

-- 8. Venue Schedule Overlap Prevention on UPDATE
CREATE TRIGGER trg_check_venue_schedule_conflict_before_update
BEFORE UPDATE OF venue_id, start_at, end_at ON events
FOR EACH ROW
BEGIN
    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1 FROM events
                WHERE venue_id = NEW.venue_id
                  AND id != NEW.id
                  AND (NEW.start_at < end_at AND NEW.end_at > start_at)
            )
            THEN RAISE(ABORT, 'Venue schedule conflict: Another event is already booked during this time range.')
        END;
END;

-- 9. Auto-update updated_at timestamp triggers
CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_events_updated_at
AFTER UPDATE ON events
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE events SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER trg_registrations_updated_at
AFTER UPDATE ON registrations
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE registrations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

-- =========================================================================
-- Analytical Views
-- =========================================================================
CREATE VIEW v_event_capacities AS
SELECT
    e.id AS event_id,
    e.title AS title,
    e.capacity AS capacity,
    COALESCE(COUNT(r.id), 0) AS registered_count,
    e.capacity - COALESCE(COUNT(r.id), 0) AS seats_remaining
FROM events e
LEFT JOIN registrations r
    ON e.id = r.event_id
    AND r.status != 'CANCELLED'
GROUP BY
    e.id,
    e.title,
    e.capacity;

-- =========================================================================
-- Seed Data
-- =========================================================================
INSERT INTO roles (id, name) VALUES
(1, 'STUDENT'),
(2, 'ADMIN');

INSERT INTO departments (id, code, name) VALUES
(1, 'CCIS', 'College of Computer and Information Sciences'),
(2, 'COE', 'College of Engineering'),
(3, 'CBA', 'College of Business Administration');

INSERT INTO users (id, role_id, department_id, student_id, first_name, last_name, email) VALUES
(1, 2, 1, NULL, 'Elena', 'Vance', 'elena.vance@campus.edu'),
(2, 2, 2, NULL, 'Marcus', 'Brody', 'marcus.brody@campus.edu'),
(3, 1, 1, '2024-10081', 'Alen', 'Masangkay', 'alen.m@campus.edu'),
(4, 1, 1, '2024-10082', 'Sophia', 'Reyes', 'sophia.reyes@campus.edu'),
(5, 1, 2, '2024-20045', 'David', 'Kim', 'david.kim@campus.edu'),
(6, 1, 3, '2024-30012', 'Chloe', 'Tan', 'chloe.tan@campus.edu');

INSERT INTO event_categories (id, name, description) VALUES
(1, 'Technology & Hackathons', 'Coding competitions, tech talks, and project showcases'),
(2, 'Career & Networking', 'Job fairs, resume clinics, and corporate networking sessions'),
(3, 'Hands-on Workshops', 'Interactive skill-building labs and technical deep dives');

INSERT INTO venues (id, name, building, capacity) VALUES
(1, 'Main University Auditorium', 'Administration Complex', 500),
(2, 'Innovation Center Lab 402', 'Turing Hall', 10),
(3, 'Executive Briefing Hall', 'Founders Building', 50);

INSERT INTO events (id, title, description, category_id, venue_id, organizer_id, capacity, start_at, end_at) VALUES
(1, 'Next.js 14 & Prisma Fullstack Hackathon', 'Build resilient enterprise applications in a 24-hour campus hackathon.', 1, 1, 1, 150, '2026-10-15T09:00:00Z', '2026-10-16T09:00:00Z'),
(2, 'AI & Relational Database Architecture Seminar', 'Master 3NF modeling, indexing strategies, and database query optimization.', 3, 2, 1, 2, '2026-10-20T13:00:00Z', '2026-10-20T16:00:00Z'),
(3, 'Annual STEM Career Expo & Roster Day', 'Connect directly with industry leaders and campus alumni recruiters.', 2, 3, 2, 50, '2026-11-05T10:00:00Z', '2026-11-05T17:00:00Z');

INSERT INTO registrations (event_id, user_id, status) VALUES
(1, 3, 'CONFIRMED'),
(1, 4, 'CONFIRMED'),
(1, 5, 'CONFIRMED'),
(2, 3, 'CONFIRMED'),
(2, 4, 'CONFIRMED'),
(3, 6, 'CONFIRMED');

COMMIT;
