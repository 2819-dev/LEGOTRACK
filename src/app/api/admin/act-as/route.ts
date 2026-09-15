import { requireAdmin, startActingAs, stopActingAs } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const userId = String(body.userId ?? "").trim();
    if (!userId) return jsonError("userId required");
    const target = await startActingAs(userId);
    return jsonOk({ actingAs: target });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (msg === "NOT_FOUND") return jsonError("User not found", 404);
    return jsonError("Could not act as user", 500);
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    await stopActingAs();
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Failed", 500);
  }
}
