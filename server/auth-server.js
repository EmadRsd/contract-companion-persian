import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Load .env when present so env vars in project root are available in dev
dotenv.config();

const TOKEN_COOKIE_NAME = 'cc_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getCookieHeader(domain) {
  const domainPart = domain ? `; Domain=${domain}` : '';
  // Allow overriding SameSite via COOKIE_SAMESITE env var for testing.
  // Default: in production use 'None' (with Secure); otherwise use 'Lax' for local dev.
  const sameSite = process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'None' : 'Lax');
  const secure = sameSite === 'None' ? '; Secure' : '';
  return `HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=${sameSite}${secure}${domainPart}`;
}

let _mongoClient = null;
let _db = null;
async function getDb() {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!uri || !dbName) throw new Error('Missing MONGODB_URI or MONGODB_DB in environment');
  _mongoClient = new MongoClient(uri);
  await _mongoClient.connect();
  _db = _mongoClient.db(dbName);
  return _db;
}

async function seedRootIfNeeded() {
  try {
    const db = await getDb();
    const users = db.collection('users');
    const rootEmail = process.env.ROOT_EMAIL;
    const rootPassword = process.env.ROOT_PASSWORD;
    if (!rootEmail || !rootPassword) return;

    const existing = await users.findOne({ email: rootEmail.toLowerCase() });
    if (existing) return;

    const passwordHash = await bcrypt.hash(rootPassword, 10);
    await users.insertOne({
      email: rootEmail.toLowerCase(),
      passwordHash,
      fullName: 'Root User',
      roles: ['root'],
      createdAt: new Date(),
    });
  } catch (err) {
    // If DB isn't configured, just log and continue — endpoints that require DB will fail with informative errors.
    console.warn('seedRootIfNeeded: skipping seed because DB is not configured or reachable:', err.message);
  }
}

async function createJwt(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET in environment');
  return jwt.sign(payload, secret, { expiresIn: `${COOKIE_MAX_AGE}s` });
}

async function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET in environment');
  return jwt.verify(token, secret);
}

async function requireAuthFromReq(req) {
  const cookieHeader = req.headers && req.headers.cookie ? req.headers.cookie : '';
  const match = cookieHeader.match(new RegExp(`${TOKEN_COOKIE_NAME}=([^;]+)`));
  if (!match) throw new Error('Unauthorized');
  const token = match[1];
  const payload = await verifyJwt(token);
  return payload;
}

async function signInHandler({ email, password, req, res }) {
  await seedRootIfNeeded();
  const db = await getDb();
  const users = db.collection('users');
  const user = await users.findOne({ email: email.toLowerCase() });
  if (!user) return { status: 401, json: { error: 'Invalid credentials' } };
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { status: 401, json: { error: 'Invalid credentials' } };

  const token = await createJwt({ sub: user._id.toString(), email: user.email, roles: user.roles || [] });

  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Set-Cookie', `${TOKEN_COOKIE_NAME}=${token}; ${getCookieHeader(process.env.COOKIE_DOMAIN)}`);
    return { status: 200, json: { ok: true } };
  }

  return { status: 200, json: { token } };
}

async function signOutHandler({ req, res }) {
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Set-Cookie', `${TOKEN_COOKIE_NAME}=deleted; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
    return { status: 200, json: { ok: true } };
  }
  return { status: 200, json: { ok: true } };
}

async function getSessionHandler({ req }) {
  // seed root user if DB configured — if DB missing this will just log and continue
  await seedRootIfNeeded();
  const cookieHeader = req.headers && req.headers.cookie ? req.headers.cookie : '';
  const match = cookieHeader.match(new RegExp(`${TOKEN_COOKIE_NAME}=([^;]+)`));
  if (!match) return { status: 200, json: { user: null } };
  const token = match[1];
  try {
    const payload = await verifyJwt(token);
    return { status: 200, json: { user: payload } };
  } catch (err) {
    return { status: 200, json: { user: null } };
  }
}

async function createUserHandler({ email, password, fullName, roles, req, res, authUser }) {
  if (!authUser || !(authUser.roles || []).includes('root')) {
    return { status: 403, json: { error: 'Forbidden' } };
  }
  const db = await getDb();
  const users = db.collection('users');
  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) return { status: 400, json: { error: 'User exists' } };
  const passwordHash = await bcrypt.hash(password, 10);
  const resInsert = await users.insertOne({
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    roles: roles || [],
    createdAt: new Date(),
  });
  return { status: 201, json: { ok: true, id: resInsert.insertedId } };
}

async function createRoleHandler({ name, permissions, authUser }) {
  if (!authUser || !(authUser.roles || []).includes('root')) return { status: 403, json: { error: 'Forbidden' } };
  const db = await getDb();
  const roles = db.collection('roles');
  const existing = await roles.findOne({ name });
  if (existing) return { status: 400, json: { error: 'Role exists' } };
  await roles.insertOne({ name, permissions: permissions || [], createdAt: new Date() });
  return { status: 201, json: { ok: true } };
}

const app = express();
const FRONTEND_ORIGIN = process.env.VITE_FRONTEND_ORIGIN || 'http://localhost:8080';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(bodyParser.json());

// Simple startup log for debugging environment
console.log('Auth server configured with:');
console.log(' - VITE_FRONTEND_ORIGIN=', FRONTEND_ORIGIN);
console.log(' - AUTH_PORT=', process.env.AUTH_PORT || '8081');

app.options('*', cors({ origin: FRONTEND_ORIGIN, credentials: true }));

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;
  const result = await signInHandler({ email, password, req, res });
  res.status(result.status).json(result.json);
});

app.post('/api/auth/signout', async (req, res) => {
  const result = await signOutHandler({ req, res });
  res.status(result.status).json(result.json);
});

app.get('/api/auth/session', async (req, res) => {
  const result = await getSessionHandler({ req });
  res.status(result.status).json(result.json);
});

app.post('/api/auth/users', async (req, res) => {
  try {
    let authUser = null;
    try { authUser = await requireAuthFromReq(req); } catch (e) { authUser = null; }
    const { email, password, fullName, roles } = req.body;
    const result = await createUserHandler({ email, password, fullName, roles, req, res, authUser });
    res.status(result.status).json(result.json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/roles', async (req, res) => {
  try {
    let authUser = null;
    try { authUser = await requireAuthFromReq(req); } catch (e) { authUser = null; }
    const { name, permissions } = req.body;
    const result = await createRoleHandler({ name, permissions, authUser });
    res.status(result.status).json(result.json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Local DB API endpoints --------------------------------------------------
// GET  /api/db/:table?select=...&eq_field=value&maybeSingle=true&order=field:asc&limit=N
// POST /api/db/:table            -> insert document(s)
// PUT  /api/db/:table            -> update, body: { filter: { field, value }, update: { ... } }
// DELETE /api/db/:table?eq_field=value  -> delete matching docs
app.get('/api/db/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const db = await getDb();
    const col = db.collection(table);

    // build filter from eq_<field> query params
    const filter = {};
    Object.keys(req.query).forEach((k) => {
      if (k.startsWith('eq_')) {
        const field = k.slice(3);
        filter[field] = req.query[k];
      }
    });

    let cursor = col.find(filter);

    if (req.query.order) {
      const [field, dir] = String(req.query.order).split(':');
      cursor = cursor.sort({ [field]: dir === 'desc' ? -1 : 1 });
    }

    if (req.query.limit) cursor = cursor.limit(parseInt(String(req.query.limit), 10));

    const docs = await cursor.toArray();

    if (req.query.maybeSingle === 'true') {
      return res.status(200).json(docs.length ? docs[0] : null);
    }

    if (req.query.select) {
      const select = String(req.query.select).split(',').map((s) => s.trim());
      const projected = docs.map((d) => {
        const out = {};
        select.forEach((f) => { if (f in d) out[f] = d[f]; });
        return out;
      });
      return res.status(200).json(projected);
    }

    return res.status(200).json(docs);
  } catch (err) {
    console.error('/api/db GET error', err);
    return res.status(500).json({ error: String(err) });
  }
});

app.post('/api/db/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const payload = req.body;
    const db = await getDb();
    const col = db.collection(table);

    if (Array.isArray(payload)) {
      const r = await col.insertMany(payload);
      return res.status(201).json({ insertedCount: r.insertedCount, insertedIds: r.insertedIds });
    }
    const r = await col.insertOne(payload);
    return res.status(201).json({ insertedId: r.insertedId });
  } catch (err) {
    console.error('/api/db POST error', err);
    return res.status(500).json({ error: String(err) });
  }
});

app.put('/api/db/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const { filter, update } = req.body;
    if (!filter || !('field' in filter) || typeof filter.value === 'undefined') {
      return res.status(400).json({ error: 'PUT requires body: { filter: { field, value }, update: {...} }' });
    }
    const db = await getDb();
    const col = db.collection(table);
    const query = { [filter.field]: filter.value };
    const r = await col.updateMany(query, { $set: update });
    return res.status(200).json({ matchedCount: r.matchedCount, modifiedCount: r.modifiedCount });
  } catch (err) {
    console.error('/api/db PUT error', err);
    return res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/db/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const db = await getDb();
    const col = db.collection(table);
    // build filter from eq_ query params
    const filter = {};
    Object.keys(req.query).forEach((k) => {
      if (k.startsWith('eq_')) filter[k.slice(3)] = req.query[k];
    });
    if (Object.keys(filter).length === 0) {
      return res.status(400).json({ error: 'DELETE requires at least one eq_<field>=<value> query param' });
    }
    const r = await col.deleteMany(filter);
    return res.status(200).json({ deletedCount: r.deletedCount });
  } catch (err) {
    console.error('/api/db DELETE error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// --- Support for set-session used by local client (e.g. OAuth adapters) --------
// Accepts { tokens } or { user } in the body. If tokens.user or user present, create a JWT and set cookie.
app.post('/api/auth/set-session', async (req, res) => {
  try {
    const body = req.body || {};
    const userPayload = body.user || (body.tokens && body.tokens.user) || null;
    if (!userPayload || (!userPayload.id && !userPayload.email)) {
      return res.status(400).json({ error: 'set-session requires body.user or body.tokens.user with at least id or email' });
    }

    // Build payload for our JWT: prefer id as sub
    const sub = String(userPayload.id ?? userPayload._id ?? userPayload.user_id ?? userPayload.uid ?? userPayload.email);
    const email = userPayload.email ?? null;
    const roles = userPayload.roles ?? (Array.isArray(userPayload.role) ? userPayload.role : userPayload.roles ?? []);

    const token = await createJwt({ sub, email, roles });

    // set cookie (use COOKIE_DOMAIN if set)
    const cookieHeader = `${TOKEN_COOKIE_NAME}=${token}; ${getCookieHeader(process.env.COOKIE_DOMAIN)}`;
    res.setHeader('Set-Cookie', cookieHeader);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('/api/auth/set-session error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Use AUTH_PORT env var to avoid colliding with frontend PORT. Default to 8081 if not set.
const port = process.env.AUTH_PORT ? parseInt(process.env.AUTH_PORT) : 8081;
app.listen(port, () => {
  console.log(`Auth server listening on port ${port}`);
});
