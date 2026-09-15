import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const sql = getSql();
  const rows = await sql`
    SELECT a.hair_id, a.head_id, a.shirt_id, a.pants_id,
      h.image_data AS hair_image,
      d.image_data AS head_image,
      s.image_data AS shirt_image,
      p.image_data AS pants_image
    FROM avatars a
    LEFT JOIN avatar_pieces h ON h.id = a.hair_id
    LEFT JOIN avatar_pieces d ON d.id = a.head_id
    LEFT JOIN avatar_pieces s ON s.id = a.shirt_id
    LEFT JOIN avatar_pieces p ON p.id = a.pants_id
    WHERE a.user_id = ${session.id}
  `;
  return jsonOk({ avatar: rows[0] ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const body = await req.json();
  const hair_id = body.hair_id ?? null;
  const head_id = body.head_id ?? null;
  const shirt_id = body.shirt_id ?? null;
  const pants_id = body.pants_id ?? null;

  const sql = getSql();
  await sql`
    INSERT INTO avatars (user_id, hair_id, head_id, shirt_id, pants_id, updated_at)
    VALUES (${session.id}, ${hair_id}, ${head_id}, ${shirt_id}, ${pants_id}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      hair_id = EXCLUDED.hair_id,
      head_id = EXCLUDED.head_id,
      shirt_id = EXCLUDED.shirt_id,
      pants_id = EXCLUDED.pants_id,
      updated_at = now()
  `;
  return jsonOk({ ok: true });
}
