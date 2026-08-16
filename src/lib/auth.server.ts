// Server-only password hashing and session-token helpers (Web Crypto based).
const encoder = new TextEncoder();
const ITERATIONS = 120_000;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(value: string) {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(value.substr(i * 2, 2), 16);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const derived = await pbkdf2(password, fromHex(salt), Number(iterations));
  const expected = fromHex(hash);
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i]! ^ expected[i]!;
  return diff === 0;
}

function secret() {
  return process.env["AUTH_SECRET"] ?? "dev-only-insecure-secret-change-me";
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const SESSION_DAYS = 7;

export async function signToken(userId: string): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({ sub: userId, exp: Date.now() + SESSION_DAYS * 86_400_000 }),
    ),
  );
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyToken(token: string): Promise<string | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(),
    fromBase64Url(sig) as BufferSource,
    encoder.encode(payload),
  );
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as {
      sub?: string;
      exp?: number;
    };
    if (!data.sub || !data.exp || data.exp < Date.now()) return null;
    return data.sub;
  } catch {
    return null;
  }
}
