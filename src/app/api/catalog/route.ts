import { getSession, requireAdmin } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { compressDataUrl } from "@/lib/images";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const sql = getSql();
  const rows = await sql`
    SELECT c.id, c.name, c.image_data, c.notes, c.created_at,
      u.name AS created_by_name,
      p.id AS property_id,
      p.owner_id,
      ou.name AS owner_name
    FROM catalog_sets c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN city_properties p ON p.catalog_set_id = c.id
    LEFT JOIN users ou ON ou.id = p.owner_id
    ORDER BY c.created_at DESC
  `;
  return jsonOk({ sets: rows });
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const image = String(body.image ?? "");
    const notes = body.notes ? String(body.notes) : null;
    if (!name || !image) return jsonError("Name and photo required");

    const image_data = await compressDataUrl(image, { maxWidth: 1400, quality: 82 });
    const sql = getSql();
    const rows = await sql`
      INSERT INTO catalog_sets (name, image_data, notes, created_by)
      VALUES (${name}, ${image_data}, ${notes}, ${admin.id})
      RETURNING id, name, image_data, notes, created_at
    `;
    return jsonOk({ set: rows[0] });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Could not save set", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const id = String(body.id ?? "");
    const owner_id = body.owner_id ? String(body.owner_id) : null;
    if (!id) return jsonError("id required");

    const sql = getSql();
    const sets = await sql`SELECT id, name, image_data FROM catalog_sets WHERE id = ${id}`;
    if (!sets[0]) return jsonError("Set not found", 404);
    const set = sets[0] as { id: string; name: string; image_data: string };

    // Clear existing ownership for this catalog set
    await sql`DELETE FROM city_properties WHERE catalog_set_id = ${id}`;

    if (owner_id) {
      await sql`
        INSERT INTO city_properties (owner_id, kind, title, image_data, catalog_set_id)
        VALUES (${owner_id}, 'set', ${set.name}, ${set.image_data}, ${id})
      `;
    }
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Assign failed", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("id required");
    const sql = getSql();
    await sql`DELETE FROM city_properties WHERE catalog_set_id = ${id}`;
    await sql`DELETE FROM catalog_sets WHERE id = ${id}`;
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Delete failed", 500);
  }
}
