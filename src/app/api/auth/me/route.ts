import { getActingAs, getRealSession, getSession, isPlayerMode } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const real = await getRealSession();
  if (!real) {
    return jsonOk({
      user: null,
      realUser: null,
      actingAs: null,
      isAdmin: false,
      playerMode: false,
    });
  }

  const effective = (await getSession()) || real;
  const actingAs = await getActingAs();
  const playerMode = await isPlayerMode();
  // Hide admin chrome while in player mode or acting as someone else
  const isAdmin = real.role === "admin" && !playerMode && !actingAs;

  const sql = getSql();
  const avatarRows = await sql`
    SELECT hair_id, head_id, shirt_id, pants_id
    FROM avatars WHERE user_id = ${effective.id}
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

  const profileRows = await sql`
    SELECT job FROM users WHERE id = ${effective.id} LIMIT 1
  `;

  return jsonOk({
    user: {
      ...effective,
      job: (profileRows[0] as { job: string | null } | undefined)?.job ?? null,
    },
    realUser: real,
    actingAs,
    isAdmin,
    canAdmin: real.role === "admin",
    playerMode,
    avatarComplete: complete,
  });
}
