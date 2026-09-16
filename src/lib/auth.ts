import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getSql, type UserRow } from "./db";

const COOKIE = "legotrack_session";
const ACT_AS_COOKIE = "legotrack_act_as";
const PLAYER_MODE_COOKIE = "legotrack_player_mode";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  role: "admin" | "player";
};

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, cookieOpts(60 * 60 * 24 * 30));
  jar.delete(ACT_AS_COOKIE);
  jar.delete(PLAYER_MODE_COOKIE);
}

/** Refresh JWT name/role after admin edits (e.g. rename yourself). */
export async function refreshSessionIfSelf(userId: string) {
  const real = await getRealSession();
  if (!real || real.id !== userId) return;
  const fresh = await findUserById(userId);
  if (!fresh) return;
  const jar = await cookies();
  const actAs = jar.get(ACT_AS_COOKIE)?.value;
  const playerMode = jar.get(PLAYER_MODE_COOKIE)?.value;
  await createSession(fresh);
  if (actAs) {
    jar.set(ACT_AS_COOKIE, actAs, cookieOpts(60 * 60 * 24 * 7));
  }
  if (playerMode === "1" && fresh.role === "admin") {
    jar.set(PLAYER_MODE_COOKIE, "1", cookieOpts(60 * 60 * 24 * 30));
  }
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(ACT_AS_COOKIE);
  jar.delete(PLAYER_MODE_COOKIE);
}

export async function isPlayerMode(): Promise<boolean> {
  const real = await getRealSession();
  if (!real || real.role !== "admin") return false;
  const jar = await cookies();
  return jar.get(PLAYER_MODE_COOKIE)?.value === "1";
}

/** Admin experiences the app as a normal player (hides admin chrome). */
export async function startPlayerMode() {
  await requireAdmin();
  await stopActingAs();
  const jar = await cookies();
  jar.set(PLAYER_MODE_COOKIE, "1", cookieOpts(60 * 60 * 24 * 30));
}

export async function stopPlayerMode() {
  const jar = await cookies();
  jar.delete(PLAYER_MODE_COOKIE);
}

export async function getRealSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      id: String(payload.id),
      name: String(payload.name),
      role: payload.role === "admin" ? "admin" : "player",
    };
  } catch {
    return null;
  }
}

async function findUserById(id: string): Promise<SessionUser | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, role FROM users WHERE id = ${id} LIMIT 1
  `;
  const row = rows[0] as { id: string; name: string; role: string } | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role === "admin" ? "admin" : "player",
  };
}

/** Effective user for submissions / avatar / ownership (honors act-as). */
export async function getSession(): Promise<SessionUser | null> {
  const real = await getRealSession();
  if (!real) return null;

  if (real.role !== "admin") return real;

  const jar = await cookies();
  const actAsId = jar.get(ACT_AS_COOKIE)?.value;
  if (!actAsId || actAsId === real.id) return real;

  const target = await findUserById(actAsId);
  if (!target) {
    jar.delete(ACT_AS_COOKIE);
    return real;
  }
  return target;
}

export async function getActingAs(): Promise<SessionUser | null> {
  const real = await getRealSession();
  if (!real || real.role !== "admin") return null;
  const jar = await cookies();
  const actAsId = jar.get(ACT_AS_COOKIE)?.value;
  if (!actAsId || actAsId === real.id) return null;
  return findUserById(actAsId);
}

export async function startActingAs(userId: string) {
  const real = await requireAdmin();
  if (userId === real.id) {
    await stopActingAs();
    return real;
  }
  const target = await findUserById(userId);
  if (!target) throw new Error("NOT_FOUND");
  const jar = await cookies();
  jar.set(ACT_AS_COOKIE, target.id, cookieOpts(60 * 60 * 24 * 7));
  return target;
}

export async function stopActingAs() {
  const jar = await cookies();
  jar.delete(ACT_AS_COOKIE);
}

export async function requireUser() {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await getRealSession();
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export async function findUserByName(name: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, password_hash, password_plain, must_change_password, role, created_at
    FROM users
    WHERE lower(name) = lower(${name})
    LIMIT 1
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}
