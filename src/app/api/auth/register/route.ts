import {
  createSession,
  findUserByName,
  hashPassword,
} from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");
    const kiosk = body.kiosk === true;

    // New accounts only on the city iPad (home-button family)
    if (!kiosk) {
      return jsonError("New accounts only on the city iPad", 403);
    }

    if (name.length < 2) return jsonError("Name must be at least 2 characters");
    if (password.length < 3) return jsonError("Password must be at least 3 characters");

    const existing = await findUserByName(name);
    if (existing) return jsonError("That name is already taken", 409);

    const password_hash = await hashPassword(password);
    const sql = getSql();
    const rows = await sql`
      INSERT INTO users (name, password_hash, role)
      VALUES (${name}, ${password_hash}, 'player')
      RETURNING id, name, role
    `;
    const user = rows[0] as { id: string; name: string; role: "player" };
    await createSession({ id: user.id, name: user.name, role: user.role });
    await sql`
      INSERT INTO avatars (user_id) VALUES (${user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;
    return jsonOk({ id: user.id, name: user.name, role: user.role, needsAvatar: true });
  } catch (e) {
    console.error(e);
    return jsonError("Could not create account", 500);
  }
}
