import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database', 'dev.db');

// Ensure database is initialized
if (!fs.existsSync(DB_PATH)) {
  console.log('[DB] database/dev.db not found. Initializing from schema.sql...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
  const initDb = new DatabaseSync(DB_PATH);
  initDb.exec(schemaSql);
  initDb.close();
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- API Routes ---

  // 1. GET /api/events
  if (method === 'GET' && pathname === '/api/events') {
    try {
      const events = db.prepare(`
        SELECT 
          e.id,
          COALESCE(e.slug, CAST(e.id AS TEXT)) AS slug,
          e.title,
          e.description,
          c.name AS category,
          v.name AS venue,
          e.capacity,
          e.start_at AS startAt,
          e.end_at AS endAt,
          COALESCE(e.image_url, 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80') AS image,
          COALESCE(e.image_alt, e.title) AS imageAlt,
          substr(e.start_at, 1, 10) AS date,
          strftime('%H:%M', e.start_at) || ' - ' || strftime('%H:%M', e.end_at) AS time,
          COALESCE(count_sub.registered_count, 0) AS registeredCount,
          e.capacity - COALESCE(count_sub.registered_count, 0) AS remainingSeats
        FROM events e
        JOIN event_categories c ON e.category_id = c.id
        JOIN venues v ON e.venue_id = v.id
        LEFT JOIN (
          SELECT event_id, COUNT(*) AS registered_count
          FROM registrations
          WHERE status != 'CANCELLED'
          GROUP BY event_id
        ) count_sub ON e.id = count_sub.event_id
        ORDER BY e.start_at ASC
      `).all();

      const regStmt = db.prepare(`
        SELECT 
          r.id,
          r.status,
          r.registered_at AS registeredAt,
          u.student_id AS studentId,
          u.first_name || ' ' || u.last_name AS studentName,
          u.email AS studentEmail,
          COALESCE(d.name, 'General') AS department
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE r.event_id = ? AND r.status != 'CANCELLED'
      `);

      for (const ev of events) {
        ev.registrations = regStmt.all(ev.id);
        // Ensure id in frontend can match slug or string id
        ev.id = ev.slug || String(ev.id);
      }

      sendJson(res, 200, events);
    } catch (err) {
      console.error('[API Error /api/events]:', err);
      sendJson(res, 500, { error: 'Failed to retrieve events from database' });
    }
    return;
  }

  // 2. GET /api/events/:id
  if (method === 'GET' && pathname.startsWith('/api/events/')) {
    const identifier = pathname.replace('/api/events/', '');
    try {
      const event = db.prepare(`
        SELECT 
          e.id,
          COALESCE(e.slug, CAST(e.id AS TEXT)) AS slug,
          e.title,
          e.description,
          c.name AS category,
          v.name AS venue,
          e.capacity,
          e.start_at AS startAt,
          e.end_at AS endAt,
          COALESCE(e.image_url, 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80') AS image,
          COALESCE(e.image_alt, e.title) AS imageAlt,
          substr(e.start_at, 1, 10) AS date,
          strftime('%H:%M', e.start_at) || ' - ' || strftime('%H:%M', e.end_at) AS time
        FROM events e
        JOIN event_categories c ON e.category_id = c.id
        JOIN venues v ON e.venue_id = v.id
        WHERE e.id = ? OR e.slug = ?
      `).get(identifier, identifier);

      if (!event) {
        sendJson(res, 404, { error: 'Event not found' });
        return;
      }

      event.registrations = db.prepare(`
        SELECT 
          r.id,
          r.status,
          r.registered_at AS registeredAt,
          u.student_id AS studentId,
          u.first_name || ' ' || u.last_name AS studentName,
          u.email AS studentEmail,
          COALESCE(d.name, 'General') AS department
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE r.event_id = ? AND r.status != 'CANCELLED'
      `).all(event.id);

      event.id = event.slug || String(event.id);
      sendJson(res, 200, event);
    } catch (err) {
      console.error('[API Error /api/events/:id]:', err);
      sendJson(res, 500, { error: 'Database lookup failed' });
    }
    return;
  }

const ALLOWED_EMAIL_DOMAINS = [
  '@univ.edu.ph',
  '@dlsud.edu.ph',
  '@campus.edu',
  '@cityu.edu',
  '@edu.ph'
];

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

function validateRegistrationPayload(body) {
  const errors = {};
  const studentName = sanitizeString(body.studentName);
  const studentId = sanitizeString(body.studentId);
  const email = sanitizeString(body.email).toLowerCase();
  const department = sanitizeString(body.department);
  const course = sanitizeString(body.course);
  const eventIdRaw = body.eventId;

  // 1. Student Name Validation
  if (!studentName) {
    errors.studentName = 'Full name is required.';
  } else if (studentName.length < 2) {
    errors.studentName = 'Full name must be at least 2 characters.';
  } else if (studentName.length > 100) {
    errors.studentName = 'Full name cannot exceed 100 characters.';
  } else if (!/^[a-zA-ZÀ-ÿ\s'.\-]+$/.test(studentName)) {
    errors.studentName = 'Name can only contain letters, spaces, hyphens, and apostrophes.';
  }

  // 2. Student ID Validation
  if (!studentId) {
    errors.studentId = 'Student ID is required.';
  } else {
    const idPattern = /^(20[1-3][0-9])-(\d{5})$/;
    const match = studentId.match(idPattern);
    if (!match) {
      errors.studentId = 'Student ID must follow format YYYY-XXXXX (e.g. 2024-10081).';
    } else {
      const year = parseInt(match[1], 10);
      if (year < 2015 || year > 2030) {
        errors.studentId = 'Student ID academic year must be between 2015 and 2030.';
      }
    }
  }

  // 3. Email Validation
  if (!email) {
    errors.email = 'Campus email address is required.';
  } else {
    const rfcRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!rfcRegex.test(email)) {
      errors.email = 'Please provide a valid email address format.';
    } else {
      const hasValidDomain = ALLOWED_EMAIL_DOMAINS.some((domain) => email.endsWith(domain));
      if (!hasValidDomain) {
        errors.email = 'Must use an authorized campus email (e.g. @univ.edu.ph, @cityu.edu, @campus.edu).';
      }
    }
  }

  // 4. Department Validation
  if (!department) {
    errors.department = 'Department / College is required.';
  } else if (department.length < 2) {
    errors.department = 'Department must be at least 2 characters.';
  } else if (department.length > 100) {
    errors.department = 'Department cannot exceed 100 characters.';
  }

  // 5. Course Validation
  if (!course) {
    errors.course = 'Degree program and year level is required.';
  } else if (course.length < 2) {
    errors.course = 'Degree program must be at least 2 characters.';
  } else if (course.length > 100) {
    errors.course = 'Degree program cannot exceed 100 characters.';
  }

  // 6. Event ID Validation
  if (!eventIdRaw && eventIdRaw !== 0) {
    errors.eventId = 'Event ID is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      studentName,
      studentId,
      email,
      department,
      course,
      eventId: eventIdRaw
    }
  };
}

  // 3. POST /api/registrations
  if (method === 'POST' && pathname === '/api/registrations') {
    try {
      const body = await parseBody(req);
      const validation = validateRegistrationPayload(body);

      if (!validation.isValid) {
        sendJson(res, 400, {
          success: false,
          message: 'Validation failed. Please correct the highlighted errors.',
          errors: validation.errors
        });
        return;
      }

      const { studentId, studentName, email, department: departmentName, course, eventId: eventIdRaw } = validation.sanitized;

      // Locate target event
      const event = db.prepare('SELECT id, title, capacity, start_at FROM events WHERE id = ? OR slug = ?').get(eventIdRaw, String(eventIdRaw));
      if (!event) {
        sendJson(res, 404, {
          success: false,
          message: 'Selected event could not be found.'
        });
        return;
      }

      // Check if event is in the past
      const eventDate = new Date(event.start_at);
      if (!isNaN(eventDate.getTime()) && eventDate.getTime() < Date.now() - 86400000) {
        sendJson(res, 400, {
          success: false,
          message: 'Registration is closed because this event has already taken place.'
        });
        return;
      }

      // Check current capacity
      const regCountRow = db.prepare('SELECT COUNT(*) AS count FROM registrations WHERE event_id = ? AND status != "CANCELLED"').get(event.id);
      if (regCountRow && regCountRow.count >= event.capacity) {
        sendJson(res, 409, {
          success: false,
          message: 'This event is already at full capacity. Please choose another event.'
        });
        return;
      }

      // Find or create student user
      let user = db.prepare('SELECT id, student_id, email FROM users WHERE student_id = ? OR email = ?').get(studentId, email);

      if (!user) {
        let dept = db.prepare('SELECT id FROM departments WHERE name = ? OR code = ?').get(departmentName, departmentName);
        if (!dept) {
          const deptCode = departmentName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'DEPT';
          try {
            const insDept = db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)');
            const r = insDept.run(deptCode + '-' + Math.floor(100 + Math.random() * 900), departmentName);
            dept = { id: Number(r.lastInsertRowid) };
          } catch {
            dept = { id: 1 };
          }
        }

        const nameParts = studentName.split(' ');
        const firstName = nameParts[0] || 'Student';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        const insUser = db.prepare(`
          INSERT INTO users (role_id, department_id, student_id, first_name, last_name, email)
          VALUES (1, ?, ?, ?, ?, ?)
        `);
        const userRes = insUser.run(dept.id, studentId, firstName, lastName, email);
        user = { id: Number(userRes.lastInsertRowid), student_id: studentId, email };
      }

      // Check if user is already registered for this event
      const existingReg = db.prepare('SELECT id, status FROM registrations WHERE event_id = ? AND user_id = ?').get(event.id, user.id);
      if (existingReg && existingReg.status !== 'CANCELLED') {
        sendJson(res, 409, {
          success: false,
          message: 'You are already registered for this event.'
        });
        return;
      }

      // Attempt registration (Enforces SQLite triggers and UNIQUE constraints)
      try {
        const insReg = db.prepare("INSERT INTO registrations (event_id, user_id, status) VALUES (?, ?, 'CONFIRMED')");
        insReg.run(event.id, user.id);

        sendJson(res, 201, {
          success: true,
          message: 'Registration successful. Your seat has been reserved.',
          data: {
            studentId,
            studentName,
            studentEmail: email,
            department: departmentName,
            course
          }
        });
      } catch (dbErr) {
        const msg = dbErr.message || '';
        if (msg.includes('full capacity') || msg.includes('Event registration failed')) {
          sendJson(res, 409, {
            success: false,
            message: 'This event is already full. Please choose another event.'
          });
        } else if (msg.includes('UNIQUE') || msg.includes('uq_registrations_user_event')) {
          sendJson(res, 409, {
            success: false,
            message: 'You are already registered for this event.'
          });
        } else {
          sendJson(res, 400, {
            success: false,
            message: `Database registration error: ${msg}`
          });
        }
      }
    } catch (err) {
      console.error('[API Error /api/registrations]:', err);
      sendJson(res, 500, { success: false, message: 'Internal server error processing registration' });
    }
    return;
  }

  // 4. GET /api/admin/attendees
  if (method === 'GET' && pathname === '/api/admin/attendees') {
    const eventId = parsedUrl.searchParams.get('eventId');
    try {
      let query = `
        SELECT 
          r.id AS registrationId,
          r.status,
          r.registered_at AS registeredAt,
          e.id AS eventId,
          e.title AS eventTitle,
          u.student_id AS studentId,
          u.first_name || ' ' || u.last_name AS studentName,
          u.email AS studentEmail,
          COALESCE(d.name, 'General') AS department
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        JOIN users u ON r.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
      `;
      const params = [];
      if (eventId) {
        query += ' WHERE e.id = ? OR e.slug = ?';
        params.push(eventId, eventId);
      }
      query += ' ORDER BY r.registered_at DESC';

      const attendees = db.prepare(query).all(...params);
      sendJson(res, 200, attendees);
    } catch (err) {
      console.error('[API Error /api/admin/attendees]:', err);
      sendJson(res, 500, { error: 'Failed to retrieve attendees' });
    }
    return;
  }

  // --- Static File Serving ---
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security check: ensure filePath stays within __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Campus Event Management System Server`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`  Database:  ${DB_PATH}`);
  console.log(`======================================================\n`);
});
