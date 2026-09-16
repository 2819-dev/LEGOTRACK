import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const includeExclusive = searchParams.get("includeExclusive") === "1";
  const sql = getSql();

  const rows = category
    ? includeExclusive
      ? await sql`
        SELECT
          p.id, p.category, p.label, p.image_data, p.image_back, p.color_key, p.quantity,
          p.source_scan_id, p.created_at, p.exclusive_minifig_id,
          (
            SELECT count(*)::int FROM avatars a
            WHERE a.helmet_id = p.id OR a.hair_id = p.id OR a.head_id = p.id
               OR a.shirt_id = p.id OR a.pants_id = p.id
          ) AS taken_count
        FROM avatar_pieces p
        WHERE p.category = ${category}
        ORDER BY p.created_at DESC
      `
      : await sql`
        SELECT
          p.id, p.category, p.label, p.image_data, p.image_back, p.color_key, p.quantity,
          p.source_scan_id, p.created_at, p.exclusive_minifig_id,
          (
            SELECT count(*)::int FROM avatars a
            WHERE a.helmet_id = p.id OR a.hair_id = p.id OR a.head_id = p.id
               OR a.shirt_id = p.id OR a.pants_id = p.id
          ) AS taken_count
        FROM avatar_pieces p
        WHERE p.category = ${category}
          AND p.exclusive_minifig_id IS NULL
        ORDER BY p.created_at DESC
      `
    : includeExclusive
      ? await sql`
        SELECT
          p.id, p.category, p.label, p.image_data, p.image_back, p.color_key, p.quantity,
          p.source_scan_id, p.created_at, p.exclusive_minifig_id,
          (
            SELECT count(*)::int FROM avatars a
            WHERE a.helmet_id = p.id OR a.hair_id = p.id OR a.head_id = p.id
               OR a.shirt_id = p.id OR a.pants_id = p.id
          ) AS taken_count
        FROM avatar_pieces p
        ORDER BY p.category, p.created_at DESC
      `
      : await sql`
        SELECT
          p.id, p.category, p.label, p.image_data, p.image_back, p.color_key, p.quantity,
          p.source_scan_id, p.created_at, p.exclusive_minifig_id,
          (
            SELECT count(*)::int FROM avatars a
            WHERE a.helmet_id = p.id OR a.hair_id = p.id OR a.head_id = p.id
               OR a.shirt_id = p.id OR a.pants_id = p.id
          ) AS taken_count
        FROM avatar_pieces p
        WHERE p.exclusive_minifig_id IS NULL
        ORDER BY p.category, p.created_at DESC
      `;

  const pieces = (rows as Array<Record<string, unknown>>).map((p) => {
    const quantity = Number(p.quantity || 1);
    const taken = Number(p.taken_count || 0);
    const available = Math.max(0, quantity - taken);
    return {
      ...p,
      quantity,
      taken_count: taken,
      available,
      isTaken: available <= 0,
    };
  });

  // Available first, taken last
  pieces.sort((a, b) => Number(a.isTaken) - Number(b.isTaken));

  return jsonOk({ pieces });
}
