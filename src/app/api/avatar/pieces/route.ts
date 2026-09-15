import { getSession } from "@/lib/auth";
import { getSql, type AvatarPiece } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const sql = getSql();

  if (category) {
    const rows = await sql`
      SELECT id, category, label, image_data, source_scan_id, created_at
      FROM avatar_pieces
      WHERE category = ${category}
      ORDER BY created_at DESC
    `;
    return jsonOk({ pieces: rows as AvatarPiece[] });
  }

  const rows = await sql`
    SELECT id, category, label, image_data, source_scan_id, created_at
    FROM avatar_pieces
    ORDER BY category, created_at DESC
  `;
  return jsonOk({ pieces: rows as AvatarPiece[] });
}
