import { createSession, findUserByName, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");
    if (!name || !password) return jsonError("Name and password required");

    const user = await findUserByName(name);
    if (!user) return jsonError("Wrong name or password", 401);
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return jsonError("Wrong name or password", 401);

    await createSession({ id: user.id, name: user.name, role: user.role });
    return jsonOk({ id: user.id, name: user.name, role: user.role });
  } catch (e) {
    console.error(e);
    return jsonError("Login failed", 500);
  }
}
