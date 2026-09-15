import {
  requireAdmin,
  hashPassword,
  refreshSessionIfSelf,
  getActingAs,
  stopActingAs,
} from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const sql = getSql();
    const users = await sql`
      SELECT u.id, u.name, u.role, u.created_at,
        (a.hair_id IS NOT NULL AND a.head_id IS NOT NULL AND a.shirt_id IS NOT NULL AND a.pants_id IS NOT NULL) AS avatar_complete
      FROM users u
      LEFT JOIN avatars a ON a.user_id = u.id
      ORDER BY u.created_at DESC
    `;
    return jsonOk({ users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Failed", 500);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "player";
    if (!name || !password) return jsonError("Name and password required");

    const password_hash = await hashPassword(password);
    const sql = getSql();
    const rows = await sql`
      INSERT INTO users (name, password_hash, role)
      VALUES (${name}, ${password_hash}, ${role})
      RETURNING id, name, role, created_at
    `;
    await sql`
      INSERT INTO avatars (user_id) VALUES (${rows[0].id})
      ON CONFLICT DO NOTHING
    `;
    return jsonOk({ user: rows[0] });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Could not add user (name may be taken)", 400);
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) return jsonError("id required");

    const sql = getSql();
    const existing = await sql`SELECT id, name, role FROM users WHERE id = ${id} LIMIT 1`;
    if (!existing[0]) return jsonError("User not found", 404);

    const updates: { name?: string; role?: string; password_hash?: string } = {};

    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) return jsonError("Name cannot be empty");
      if (name.length > 40) return jsonError("Name too long");
      updates.name = name;
    }

    if (body.role != null) {
      const role = body.role === "admin" ? "admin" : "player";
      if (id === admin.id && role !== "admin") {
        return jsonError("You cannot demote yourself");
      }
      updates.role = role;
    }

    if (body.password != null && String(body.password).length > 0) {
      const password = String(body.password);
      if (password.length < 3) return jsonError("Password too short");
      updates.password_hash = await hashPassword(password);
    }

    if (!updates.name && !updates.role && !updates.password_hash) {
      return jsonError("Nothing to update");
    }

    if (updates.name) {
      try {
        await sql`UPDATE users SET name = ${updates.name} WHERE id = ${id}`;
      } catch {
        return jsonError("That name is already taken", 400);
      }
    }
    if (updates.role) {
      await sql`UPDATE users SET role = ${updates.role} WHERE id = ${id}`;
    }
    if (updates.password_hash) {
      await sql`UPDATE users SET password_hash = ${updates.password_hash} WHERE id = ${id}`;
    }

    await refreshSessionIfSelf(id);

    const rows = await sql`
      SELECT u.id, u.name, u.role, u.created_at,
        (a.hair_id IS NOT NULL AND a.head_id IS NOT NULL AND a.shirt_id IS NOT NULL AND a.pants_id IS NOT NULL) AS avatar_complete
      FROM users u
      LEFT JOIN avatars a ON a.user_id = u.id
      WHERE u.id = ${id}
    `;
    return jsonOk({ user: rows[0] });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Update failed", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();
    if (!id) return jsonError("id required");
    if (id === admin.id) return jsonError("You cannot delete yourself");

    const sql = getSql();
    const existing = await sql`SELECT id, name FROM users WHERE id = ${id} LIMIT 1`;
    if (!existing[0]) return jsonError("User not found", 404);

    await sql`DELETE FROM city_properties WHERE owner_id = ${id}`;
    await sql`DELETE FROM city_properties WHERE source_build_id IN (
      SELECT id FROM build_submissions WHERE user_id = ${id}
    )`;
    await sql`UPDATE build_submissions SET reviewed_by = NULL WHERE reviewed_by = ${id}`;
    await sql`DELETE FROM build_submissions WHERE user_id = ${id}`;
    await sql`UPDATE catalog_sets SET created_by = ${admin.id} WHERE created_by = ${id}`;
    await sql`DELETE FROM avatars WHERE user_id = ${id}`;

    const acting = await getActingAs();
    if (acting?.id === id) await stopActingAs();

    await sql`DELETE FROM users WHERE id = ${id}`;

    return jsonOk({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Delete failed — user may still own linked records", 500);
  }
}
