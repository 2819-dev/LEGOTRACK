import { destroySession, buildClearSessionCookies } from "@/lib/auth";
import { jsonOkWithCookies } from "@/lib/api";

export async function POST() {
  try {
    await destroySession();
  } catch {
    // Still clear cookies via headers if jar delete fails
  }
  return jsonOkWithCookies({ ok: true }, buildClearSessionCookies());
}
