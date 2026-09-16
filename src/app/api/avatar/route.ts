import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

async function claimCount(sql: ReturnType<typeof getSql>, pieceId: string) {
  const rows = await sql`
    SELECT count(*)::int AS n FROM avatars
    WHERE helmet_id = ${pieceId} OR hair_id = ${pieceId} OR head_id = ${pieceId}
       OR shirt_id = ${pieceId} OR pants_id = ${pieceId}
  `;
  return Number((rows[0] as { n: number }).n || 0);
}

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const sql = getSql();
  const rows = await sql`
    SELECT a.helmet_id, a.hair_id, a.head_id, a.shirt_id, a.pants_id, a.exclusive_id,
      he.image_data AS helmet_image, he.image_back AS helmet_back,
      h.image_data AS hair_image, h.image_back AS hair_back,
      d.image_data AS head_image, d.image_back AS head_back,
      s.image_data AS shirt_image, s.image_back AS shirt_back,
      p.image_data AS pants_image, p.image_back AS pants_back
    FROM avatars a
    LEFT JOIN avatar_pieces he ON he.id = a.helmet_id
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
  const helmet_id = body.helmet_id ?? null;
  const hair_id = body.hair_id ?? null;
  const head_id = body.head_id ?? null;
  const shirt_id = body.shirt_id ?? null;
  const pants_id = body.pants_id ?? null;
  const clearExclusive = body.clearExclusive !== false;

  const sql = getSql();

  const current = await sql`
    SELECT helmet_id, hair_id, head_id, shirt_id, pants_id, exclusive_id
    FROM avatars WHERE user_id = ${session.id}
  `;
  const cur = (current[0] || {}) as Record<string, string | null>;

  // Changing individual parts clears exclusive lock.
  if (cur.exclusive_id && clearExclusive) {
    // allow continue — we'll null exclusive_id below
  }

  const next = { helmet_id, hair_id, head_id, shirt_id, pants_id } as Record<
    string,
    string | null
  >;

  for (const key of ["helmet_id", "hair_id", "head_id", "shirt_id", "pants_id"] as const) {
    const pieceId = next[key];
    if (!pieceId) continue;
    if (cur[key] === pieceId) continue;
    const stock = await sql`
      SELECT quantity, exclusive_minifig_id FROM avatar_pieces WHERE id = ${pieceId} LIMIT 1
    `;
    if (!stock[0]) return jsonError("Piece not found", 404);
    if ((stock[0] as { exclusive_minifig_id: string | null }).exclusive_minifig_id) {
      return jsonError("That piece is part of an exclusive minifig", 409);
    }
    const taken = await claimCount(sql, pieceId);
    const qty = Number((stock[0] as { quantity: number }).quantity || 1);
    if (taken >= qty) {
      return jsonError("This piece is unavailable", 409);
    }
  }

  await sql`
    INSERT INTO avatars (user_id, helmet_id, hair_id, head_id, shirt_id, pants_id, exclusive_id, updated_at)
    VALUES (
      ${session.id}, ${helmet_id}, ${hair_id}, ${head_id}, ${shirt_id}, ${pants_id},
      ${clearExclusive ? null : cur.exclusive_id}, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      helmet_id = EXCLUDED.helmet_id,
      hair_id = EXCLUDED.hair_id,
      head_id = EXCLUDED.head_id,
      shirt_id = EXCLUDED.shirt_id,
      pants_id = EXCLUDED.pants_id,
      exclusive_id = EXCLUDED.exclusive_id,
      updated_at = now()
  `;
  return jsonOk({ ok: true });
}
