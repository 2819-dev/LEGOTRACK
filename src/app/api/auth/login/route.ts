import {
  buildSessionCookies,
  findUserByName,
  verifyPassword,
} from "@/lib/auth";
import { isAccessGateEnabled } from "@/lib/settings";
import { jsonError, jsonOkWithCookies } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");
    const kiosk = body.kiosk === true;
    if (!name || !password) return jsonError("Name and password required");

    const user = await findUserByName(name);
    if (!user) return jsonError("Wrong name or password", 401);
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return jsonError("Wrong name or password", 401);

    const gateOn = await isAccessGateEnabled();
    // When Access Denied gate is on, only kiosk players or any admin may sign in
    if (gateOn && !kiosk && user.role !== "admin") {
      return jsonError("Only admin can sign in from this device", 403);
    }

    const setCookies = await buildSessionCookies({
      id: user.id,
      name: user.name,
      role: user.role,
    });

    return jsonOkWithCookies(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        mustChangePassword: Boolean(user.must_change_password),
      },
      setCookies
    );
  } catch (e) {
    console.error(e);
    return jsonError("Login failed", 500);
  }
}
