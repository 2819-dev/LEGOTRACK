import { getRealSession, getSession, requireAdmin } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { compressDataUrl } from "@/lib/images";

function guessKind(title: string, description: string | null): "building" | "vehicle" | "set" | "other" {
  const t = `${title} ${description || ""}`.toLowerCase();
  if (/(car|truck|bus|bike|vehicle|train|plane|boat)/.test(t)) return "vehicle";
  if (/(house|shop|store|building|station|tower|cafe|home)/.test(t)) return "building";
  if (/(set|official)/.test(t)) return "set";
  return "other";
}

export async function GET(req: Request) {
  const real = await getRealSession();
  const session = await getSession();
  if (!real || !session) return jsonError("Unauthorized", 401);
  const sql = getSql();
  const all = new URL(req.url).searchParams.get("all") === "1";

  if (real.role === "admin" && all) {
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
  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const description = body.description ? String(body.description) : null;
    const image = String(body.image ?? "");
    if (!title || !image) return jsonError("Title and photo required");

    const image_data = await compressDataUrl(image, { maxWidth: 1400, quality: 82 });
    const sql = getSql();
    const rows = await sql`
      INSERT INTO build_submissions (user_id, title, description, image_data)
      VALUES (${session.id}, ${title}, ${description}, ${image_data})
      RETURNING id, title, status, created_at
    `;
    return jsonOk({ build: rows[0] });
  } catch (e) {
    console.error(e);
    return jsonError("Submit failed", 500);
  }
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

    const existing = await sql`
      SELECT id, user_id, title, description, image_data, status
      FROM build_submissions WHERE id = ${id}
    `;
    const build = existing[0] as
      | {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          image_data: string;
          status: string;
        }
      | undefined;
    if (!build) return jsonError("Not found", 404);

    await sql`
      UPDATE build_submissions
      SET status = ${status},
          admin_notes = ${admin_notes},
          reviewed_by = ${admin.id},
          reviewed_at = now()
      WHERE id = ${id}
    `;

    if (status === "approved" && build.status !== "approved") {
      const kind = guessKind(build.title, build.description);
      await sql`
        INSERT INTO city_properties (owner_id, kind, title, description, image_data, source_build_id)
        VALUES (
          ${build.user_id},
          ${kind},
          ${build.title},
          ${build.description},
          ${build.image_data},
          ${build.id}
        )
      `;
    }

    if (status !== "approved") {
      await sql`DELETE FROM city_properties WHERE source_build_id = ${id}`;
    }

    return jsonOk({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Review failed", 500);
  }
}
