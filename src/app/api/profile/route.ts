import {
  getSession,
  getRealSession,
  hashPassword,
  refreshSessionIfSelf,
  requireUser,
  findUserByName,
  verifyPassword,
} from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const sql = getSql();
    const rows = await sql`
      SELECT id, name, role, job, created_at FROM users WHERE id = ${user.id} LIMIT 1
    `;
    if (!rows[0]) return jsonError("Not found", 404);
    return jsonOk({ profile: rows[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError("Failed", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireUser();
    const real = await getRealSession();
    // Only edit your own account (effective user). Admins editing others use /api/admin/users.
    const body = await req.json();
    const id = session.id;

    const sql = getSql();
    const existing = await sql`
      SELECT id, name, password_hash, role, job FROM users WHERE id = ${id} LIMIT 1
    `;
    if (!existing[0]) return jsonError("Not found", 404);
    const row = existing[0] as {
      id: string;
      name: string;
      password_hash: string;
      role: string;
      job: string | null;
    };

    const updates: { name?: string; password_hash?: string; job?: string | null } = {};

    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) return jsonError("Name cannot be empty");
      if (name.length > 40) return jsonError("Name too long");
      updates.name = name;
    }

    if (body.job !== undefined) {
      const job = body.job == null ? null : String(body.job).trim();
      updates.job = job || null;
    }

    if (body.password != null && String(body.password).length > 0) {
      const password = String(body.password);
      if (password.length < 3) return jsonError("Password too short");
      // Players must confirm current password; admins editing themselves may skip
      const isRealAdmin = real?.role === "admin" && real.id === id;
      if (!isRealAdmin) {
        const current = String(body.currentPassword ?? "");
        if (!current) return jsonError("Current password required");
        const ok = await verifyPassword(current, row.password_hash);
        if (!ok) return jsonError("Current password is wrong", 403);
      }
      updates.password_hash = await hashPassword(password);
    }

    if (!updates.name && updates.job === undefined && !updates.password_hash) {
      return jsonError("Nothing to update");
    }

    if (updates.name) {
      const taken = await findUserByName(updates.name);
      if (taken && taken.id !== id) return jsonError("That name is already taken", 400);
      await sql`UPDATE users SET name = ${updates.name} WHERE id = ${id}`;
    }
    if (updates.job !== undefined) {
      await sql`UPDATE users SET job = ${updates.job} WHERE id = ${id}`;
    }
    if (updates.password_hash) {
      await sql`UPDATE users SET password_hash = ${updates.password_hash} WHERE id = ${id}`;
    }

    await refreshSessionIfSelf(id);

    const fresh = await getSession();
    const rows = await sql`
      SELECT id, name, role, job, created_at FROM users WHERE id = ${id} LIMIT 1
    `;
    return jsonOk({ profile: rows[0], user: fresh });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError("Update failed", 500);
  }
}
