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
    SELECT helmet_id, hair_id, head_id, shirt_id, pants_id
    FROM avatars WHERE user_id = ${effective.id}
  `;
  const avatar = avatarRows[0] as
    | {
        helmet_id: string | null;
        hair_id: string | null;
        head_id: string | null;
        shirt_id: string | null;
        pants_id: string | null;
      }
    | undefined;

  const complete = Boolean(
    (avatar?.helmet_id || avatar?.hair_id) &&
      avatar?.head_id &&
      avatar?.shirt_id &&
      avatar?.pants_id
  );

  const profileRows = await sql`
    SELECT job, must_change_password FROM users WHERE id = ${effective.id} LIMIT 1
  `;
  const profile = profileRows[0] as
    | { job: string | null; must_change_password: boolean }
    | undefined;

  return jsonOk({
    user: {
      ...effective,
      job: profile?.job ?? null,
    },
    realUser: real,
    actingAs,
    isAdmin,
    canAdmin: real.role === "admin",
    playerMode,
    avatarComplete: complete,
    mustChangePassword: Boolean(profile?.must_change_password) && !actingAs,
  });
}
