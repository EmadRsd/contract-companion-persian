import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const TOKEN_COOKIE_NAME = 'cc_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getCookieHeader(domain) {
  const domainPart = domain ? `; Domain=${domain}` : '';
  return `HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${domainPart}`;
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
app.use(cors({ origin: process.env.VITE_FRONTEND_ORIGIN || 'http://localhost:8080', credentials: true }));
app.use(bodyParser.json());

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

// Use AUTH_PORT env var to avoid colliding with frontend PORT. Default to 8081 if not set.
const port = process.env.AUTH_PORT ? parseInt(process.env.AUTH_PORT) : 8081;
app.listen(port, () => {
  console.log(`Auth server listening on port ${port}`);
});
