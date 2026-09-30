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
    slug TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL,
    venue_id INTEGER NOT NULL,
    organizer_id INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    image_url TEXT,
    image_alt TEXT,
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
CREATE INDEX idx_events_slug ON events (slug);
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
    e.slug AS slug,
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
    e.slug,
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
(3, 'CBA', 'College of Business Administration'),
(4, 'CAS', 'College of Arts and Sciences'),
(5, 'CON', 'College of Nursing');

INSERT INTO users (id, role_id, department_id, student_id, first_name, last_name, email) VALUES
(1, 2, 1, NULL, 'Elena', 'Vance', 'elena.vance@campus.edu'),
(2, 2, 2, NULL, 'Marcus', 'Brody', 'marcus.brody@campus.edu'),
(3, 1, 1, '2023-10492', 'Alicia', 'Santos', 'alicia.santos@cityu.edu'),
(4, 1, 1, '2022-11808', 'Marcus', 'Chen', 'marcus.chen@cityu.edu'),
(5, 1, 2, '2024-10144', 'Diana', 'Gomez', 'diana.gomez@cityu.edu'),
(6, 1, 1, '2021-11957', 'Haruto', 'Lee', 'haruto.lee@cityu.edu'),
(7, 1, 1, '2023-21533', 'Nina', 'Patel', 'nina.patel@cityu.edu'),
(8, 1, 3, '2024-34011', 'Ethan', 'Brooks', 'ethan.brooks@cityu.edu'),
(9, 1, 4, '2023-34021', 'Priya', 'Shah', 'priya.shah@cityu.edu'),
(10, 1, 4, '2023-23110', 'Sarah', 'Nguyen', 'sarah.nguyen@cityu.edu'),
(11, 1, 1, '2024-10081', 'Alen', 'Masangkay', 'alen.m@campus.edu');

INSERT INTO event_categories (id, name, description) VALUES
(1, 'Academic', 'Coding workshops, technical talks, and academic lectures'),
(2, 'Sports', 'Interdepartmental tournaments, athletic meets, and fitness sessions'),
(3, 'Workshop', 'Interactive skill-building labs and professional development'),
(4, 'Social', 'Campus fairs, cultural gatherings, and student networking');

INSERT INTO venues (id, name, building, capacity) VALUES
(1, 'Engineering Building, Room 204', 'Engineering Complex', 50),
(2, 'University Gymnasium', 'Sports Complex', 100),
(3, 'Main Auditorium', 'Administration Complex', 500),
(4, 'Student Center Plaza', 'Student Center', 60);

INSERT INTO events (id, slug, title, description, category_id, venue_id, organizer_id, capacity, start_at, end_at, image_url, image_alt) VALUES
(1, 'web-development-workshop', 'Web Development Workshop', 'Learn modern front-end and back-end development practices through a hands-on workshop led by faculty mentors and industry partners.', 1, 1, 1, 50, '2026-10-15T13:00:00Z', '2026-10-15T16:00:00Z', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80', 'Students collaborating on laptops during a university web development workshop'),
(2, 'basketball-tournament', 'University Basketball Tournament', 'Join students from multiple colleges for an exciting interdepartmental basketball showdown with team spirit and campus pride on the line.', 2, 2, 1, 100, '2026-11-02T17:30:00Z', '2026-11-02T20:30:00Z', 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80', 'Players competing in a basketball tournament inside a university gymnasium'),
(3, 'leadership-seminar', 'Student Leadership Seminar', 'Develop effective leadership, communication, and community engagement skills in a session designed for aspiring student leaders and club officers.', 3, 3, 2, 80, '2026-10-28T09:00:00Z', '2026-10-28T11:30:00Z', 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', 'Students seated together attending a leadership seminar in a university auditorium'),
(4, 'wellness-fair', 'Campus Wellness Fair', 'Explore wellness activities, resource booths, and student-led programs focused on physical, mental, and emotional health across campus.', 4, 4, 2, 60, '2026-11-16T10:00:00Z', '2026-11-16T14:00:00Z', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80', 'Students gathering at a campus wellness fair with booths and activities');

INSERT INTO registrations (event_id, user_id, status) VALUES
(1, 3, 'CONFIRMED'),
(1, 4, 'CONFIRMED'),
(1, 5, 'CONFIRMED'),
(1, 6, 'CONFIRMED'),
(1, 7, 'CONFIRMED'),
(2, 8, 'CONFIRMED'),
(2, 9, 'CONFIRMED'),
(3, 10, 'CONFIRMED'),
(4, 11, 'CONFIRMED');

COMMIT;
