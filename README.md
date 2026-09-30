# Campus Event Management System

This project is a full-stack prototype for an Online Campus Event Management System featuring a 3NF SQLite database with concurrency triggers, REST API routes, and an accessible, responsive front-end.

## Architecture & Structure

- `index.html` — Semantic HTML5 page shell with WCAG accessible modal dialogs
- `css/` — Modular CSS styling (layout, components, forms, accessibility, responsive)
- `js/` — Front-end ES modules for state, UI components, event service, and validation
- `database/`
  - `schema.sql` — 3NF relational DDL script with foreign keys, CHECK constraints, non-clustered indexes, and triggers
  - `SCHEMA_DESIGN.md` — Detailed database architecture specification and normalization justification
  - `dev.db` — SQLite database
- `backend/`
  - `prisma/schema.prisma` — Prisma ORM relational schema definition
  - `lib/prisma.ts` — Prisma client instance utility
- `server.js` — Zero-dependency Node.js REST API & static web server

## Features

- **3NF Relational Database**: Normalized entities (`users`, `roles`, `departments`, `events`, `venues`, `event_categories`, `registrations`).
- **Database-Level Capacity Enforcement**: SQLite triggers preventing overbooking and venue physical safety violations.
- **Duplicate Registration Prevention**: Database `UNIQUE(user_id, event_id)` candidate keys preventing duplicate student registrations.
- **Searchable & Filterable Catalog**: Real-time category, date, and keyword search filters.
- **WCAG 2.1 AA Accessibility**: Semantic HTML5 tags, `aria-label` form bindings, accessible contrast, and modal focus trapping.
- **Live Seat Availability Metrics**: Real-time remaining seat counters and capacity progress bars.

## Run Locally

1. **Install & Seed Database**:
   ```bash
   npm run db:seed
   ```

2. **Start Full-Stack Application**:
   ```bash
   npm start
   ```
   *or*
   ```bash
   node server.js
   ```

3. **Open in Browser**:
   Visit [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/events` | List all events with real-time seat counts and registered rosters |
| `GET` | `/api/events/:id` | Get single event details with attendee list |
| `POST` | `/api/registrations` | Register student for an event (enforces DB constraints) |
| `GET` | `/api/admin/attendees` | Get attendee roster filtered by event (`?eventId=xyz`) |
