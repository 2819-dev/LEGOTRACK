import { requireAdmin, startPlayerMode, stopPlayerMode, isPlayerMode } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ playerMode: await isPlayerMode() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Failed", 500);
  }
}

export async function POST() {
  try {
    await startPlayerMode();
    return jsonOk({ playerMode: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Failed", 500);
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    await stopPlayerMode();
    return jsonOk({ playerMode: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Failed", 500);
  }
}
