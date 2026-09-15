import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const sql = getSql();

  const people = await sql`
    SELECT
      u.id,
      u.name,
      u.job,
      u.role,
      h.image_data AS hair_image,
      d.image_data AS head_image,
      s.image_data AS shirt_image,
      p.image_data AS pants_image,
      (SELECT COUNT(*)::int FROM city_properties cp WHERE cp.owner_id = u.id) AS owns_count,
      (SELECT COUNT(*)::int FROM build_submissions bs WHERE bs.user_id = u.id AND bs.status = 'approved') AS built_count
    FROM users u
    LEFT JOIN avatars a ON a.user_id = u.id
    LEFT JOIN avatar_pieces h ON h.id = a.hair_id
    LEFT JOIN avatar_pieces d ON d.id = a.head_id
    LEFT JOIN avatar_pieces s ON s.id = a.shirt_id
    LEFT JOIN avatar_pieces p ON p.id = a.pants_id
    WHERE u.role = 'player' OR u.role = 'admin'
    ORDER BY u.name ASC
  `;

  return jsonOk({ people });
}
