const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(bodyParser.json());

/* CONFIG - read from env in production */
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/booking' });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/* Simple rate limiter */
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200
});
app.use(limiter);

/* Helper: auth middleware */
function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h) return res.status(401).send({ error: 'Missing token' });
    const token = h.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).send({ error: 'Invalid token' });
    }
}

/* Register */
app.post('/api/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).send({ error: 'email & password required' });
    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
        const r = await client.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id,email,name',
            [email, hash, name || null]
        );
        const user = r.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).send({ token, user });
    } catch (err) {
        if (err.code === '23505') return res.status(409).send({ error: 'User exists' });
        console.error(err);
        res.status(500).send({ error: 'server error' });
    } finally {
        client.release();
    }
});

/* Login */
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const client = await pool.connect();
    try {
        const r = await client.query('SELECT id,email,password_hash,name FROM users WHERE email=$1', [email]);
        if (r.rowCount === 0) return res.status(401).send({ error: 'Invalid credentials' });
        const user = r.rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).send({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.send({ token, user: { id: user.id, email: user.email, name: user.name }});
    } finally {
        client.release();
    }
});

/* Search rooms: returns available_units per room for the requested date range */
app.get('/api/rooms', async (req, res) => {
    const { start, end, capacity, location } = req.query;
    if (!start || !end) return res.status(400).send({ error: 'start & end required' });

    const client = await pool.connect();
    try {
        // naive: compute min(available_units) across dates for each room
        const q = `
      SELECT r.*, MIN(ra.available_units) as avail
      FROM rooms r
      JOIN room_availability ra ON ra.room_id = r.id
      WHERE ra.date BETWEEN $1::date AND $2::date
      ${location ? 'AND r.location = $5' : ''}
      GROUP BY r.id
      HAVING MIN(ra.available_units) > 0
    `;
        // For simplicity, skip parameter binding variations here; use simple query
        const rows = (await client.query(
            `SELECT r.id, r.name, r.location, r.capacity, r.price_cents, MIN(ra.available_units) AS available_units
       FROM rooms r
       JOIN room_availability ra ON ra.room_id = r.id
       WHERE ra.date BETWEEN $1 AND $2
       GROUP BY r.id
       ORDER BY r.name
      `,
            [start, end]
        )).rows;
        res.send(rows);
    } finally {
        client.release();
    }
});

/* Booking endpoint with Redis lock + transactional conditional decrement */
app.post('/api/book', auth, async (req, res) => {
    const { room_id, start_date, end_date, quantity } = req.body;
    const userId = req.user.id;
    const qty = parseInt(quantity || 1, 10);
    if (!room_id || !start_date || !end_date) return res.status(400).send({ error: 'missing fields' });

    const idempotencyKey = req.header('Idempotency-Key') || null;
    // quick idempotency: if key provided, check redis for existing booking id
    if (idempotencyKey) {
        const prev = await redis.get(`idem:${idempotencyKey}`);
        if (prev) {
            return res.status(200).send({ id: prev, idempotent: true });
        }
    }

    const lockKey = `lock:room:${room_id}`;
    const lockToken = uuidv4();
    const lockTTL = 5000; // ms

    // Acquire lock (simple set NX)
    const acquired = await redis.set(lockKey, lockToken, 'PX', lockTTL, 'NX');
    if (!acquired) {
        return res.status(423).send({ error: 'Resource busy. Try again.'});
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // for each date in range, attempt to decrement available_units
        // Naive: get dates list in JS
        const s = new Date(start_date);
        const e = new Date(end_date);
        const days = [];
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d).toISOString().slice(0,10));
        }

        // For each date, run update conditional
        for (const date of days) {
            const upd = await client.query(
                `UPDATE room_availability
         SET available_units = available_units - $1
         WHERE room_id = $2 AND date = $3 AND available_units >= $1
         RETURNING available_units`,
                [qty, room_id, date]
            );
            if (upd.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(409).send({ error: `Insufficient availability for date ${date}` });
            }
        }

        // Create booking
        const bookingRes = await client.query(
            `INSERT INTO bookings (user_id, room_id, start_date, end_date) VALUES ($1,$2,$3,$4) RETURNING id, user_id, room_id, start_date, end_date, created_at`,
            [userId, room_id, start_date, end_date]
        );
        const booking = bookingRes.rows[0];
        await client.query('COMMIT');

        // store idempotency result in Redis for 24h
        if (idempotencyKey) {
            await redis.set(`idem:${idempotencyKey}`, booking.id, 'EX', 60*60*24);
        }

        res.status(201).send({ booking });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send({ error: 'server error' });
    } finally {
        client.release();
        // release lock (only if token matches)
        const cur = await redis.get(lockKey);
        if (cur === lockToken) {
            await redis.del(lockKey);
        }
    }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Listening', port));
