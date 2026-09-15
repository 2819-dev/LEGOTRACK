import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const sql = getSql();

  const users = await sql`
    SELECT
      u.id,
      u.name,
      u.job,
      u.role,
      h.image_data AS hair_image,
      d.image_data AS head_image,
      s.image_data AS shirt_image,
      p.image_data AS pants_image
    FROM users u
    LEFT JOIN avatars a ON a.user_id = u.id
    LEFT JOIN avatar_pieces h ON h.id = a.hair_id
    LEFT JOIN avatar_pieces d ON d.id = a.head_id
    LEFT JOIN avatar_pieces s ON s.id = a.shirt_id
    LEFT JOIN avatar_pieces p ON p.id = a.pants_id
    WHERE u.id = ${id}
    LIMIT 1
  `;
  if (!users[0]) return jsonError("Not found", 404);

  const owns = await sql`
    SELECT id, kind, title, description, image_data, created_at, source_build_id
    FROM city_properties
    WHERE owner_id = ${id}
    ORDER BY created_at DESC
  `;

  const builds = await sql`
    SELECT id, title, description, image_data, status, created_at
    FROM build_submissions
    WHERE user_id = ${id} AND status = 'approved'
    ORDER BY created_at DESC
  `;

  return jsonOk({
    person: users[0],
    owns,
    builds,
  });
}
