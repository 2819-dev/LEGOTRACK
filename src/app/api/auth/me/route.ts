import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonOk({ user: null });

  const sql = getSql();
  const avatarRows = await sql`
    SELECT hair_id, head_id, shirt_id, pants_id
    FROM avatars WHERE user_id = ${session.id}
  `;
  const avatar = avatarRows[0] as
    | {
        hair_id: string | null;
        head_id: string | null;
        shirt_id: string | null;
        pants_id: string | null;
      }
    | undefined;

  const complete = Boolean(
    avatar?.hair_id && avatar?.head_id && avatar?.shirt_id && avatar?.pants_id
  );

  return jsonOk({
    user: session,
    avatarComplete: complete,
  });
}
