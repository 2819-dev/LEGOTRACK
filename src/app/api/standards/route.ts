import { getSession, requireAdmin } from "@/lib/auth";
import { getSql, type Standard } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const sql = getSql();
  const rows = await sql`
    SELECT id, title, body, sort_order, is_exception
    FROM community_standards
    ORDER BY sort_order ASC, created_at ASC
  `;
  return jsonOk({ standards: rows as Standard[] });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const text = String(body.body ?? "").trim();
    const sort_order = Number(body.sort_order ?? 100);
    const is_exception = Boolean(body.is_exception);
    if (!title || !text) return jsonError("Title and body required");
    const sql = getSql();
    const rows = await sql`
      INSERT INTO community_standards (title, body, sort_order, is_exception)
      VALUES (${title}, ${text}, ${sort_order}, ${is_exception})
      RETURNING id, title, body, sort_order, is_exception
    `;
    return jsonOk({ standard: rows[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Failed", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("id required");
    const sql = getSql();
    await sql`DELETE FROM community_standards WHERE id = ${id}`;
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Failed", 500);
  }
}
