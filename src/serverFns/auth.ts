import { getDb } from '@/integrations/mongo/client.server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const TOKEN_COOKIE_NAME = 'cc_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getCookieHeader(domain?: string) {
  const domainPart = domain ? `; Domain=${domain}` : '';
  return `HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${domainPart}`;
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

async function createJwt(payload: object) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET in environment');
  return jwt.sign(payload, secret, { expiresIn: `${COOKIE_MAX_AGE}s` });
}

async function verifyJwt(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET in environment');
  return jwt.verify(token, secret) as any;
}

// The server functions below are written to be usable both from an adapter (Express)
// and potentially by TanStack Start serverFn conventions. They accept (req, res)
// style parameters when used with Express, or a plain object for other uses.

export async function signInHandler({ email, password, req, res } : any) {
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

export async function signOutHandler({ req, res } : any) {
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Set-Cookie', `${TOKEN_COOKIE_NAME}=deleted; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
    return { status: 200, json: { ok: true } };
  }
  return { status: 200, json: { ok: true } };
}

export async function getSessionHandler({ req } : any) {
  await seedRootIfNeeded();
  const cookieHeader = req?.headers?.cookie || '';
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

export async function createUserHandler({ email, password, fullName, roles, req, res, authUser } : any) {
  // Only allow root to create users if authUser is not root, reject
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

export async function createRoleHandler({ name, permissions, authUser } : any) {
  if (!authUser || !(authUser.roles || []).includes('root')) return { status: 403, json: { error: 'Forbidden' } };
  const db = await getDb();
  const roles = db.collection('roles');
  const existing = await roles.findOne({ name });
  if (existing) return { status: 400, json: { error: 'Role exists' } };
  await roles.insertOne({ name, permissions: permissions || [], createdAt: new Date() });
  return { status: 201, json: { ok: true } };
}

export async function requireAuthFromReq(req: any) {
  const cookieHeader = req?.headers?.cookie || '';
  const match = cookieHeader.match(new RegExp(`${TOKEN_COOKIE_NAME}=([^;]+)`));
  if (!match) throw new Error('Unauthorized');
  const token = match[1];
  const payload = await verifyJwt(token);
  return payload;
}
