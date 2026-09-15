import { requireAdmin, hashPassword } from "@/lib/auth";
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
