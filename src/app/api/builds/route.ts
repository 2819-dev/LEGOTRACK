import { getSession, requireAdmin } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const sql = getSql();

  if (session.role === "admin") {
    const rows = await sql`
      SELECT b.*, u.name AS user_name
      FROM build_submissions b
      JOIN users u ON u.id = b.user_id
      ORDER BY
        CASE b.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
        b.created_at DESC
    `;
    return jsonOk({ builds: rows });
  }

  const rows = await sql`
    SELECT id, title, description, image_data, status, admin_notes, created_at
    FROM build_submissions
    WHERE user_id = ${session.id}
    ORDER BY created_at DESC
  `;
  return jsonOk({ builds: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const description = body.description ? String(body.description) : null;
  const image_data = String(body.image ?? "");
  if (!title || !image_data) return jsonError("Title and photo required");

  const sql = getSql();
  const rows = await sql`
    INSERT INTO build_submissions (user_id, title, description, image_data)
    VALUES (${session.id}, ${title}, ${description}, ${image_data})
    RETURNING id, title, status, created_at
  `;
  return jsonOk({ build: rows[0] });
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const id = String(body.id ?? "");
    const status = body.status as string;
    const admin_notes = body.admin_notes != null ? String(body.admin_notes) : null;
    if (!id || !["approved", "rejected", "pending"].includes(status)) {
      return jsonError("Invalid review");
    }
    const sql = getSql();
    await sql`
      UPDATE build_submissions
      SET status = ${status},
          admin_notes = ${admin_notes},
          reviewed_by = ${admin.id},
          reviewed_at = now()
      WHERE id = ${id}
    `;
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Review failed", 500);
  }
}
