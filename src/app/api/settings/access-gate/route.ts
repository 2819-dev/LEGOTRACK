import { isAccessGateEnabled } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { setSetting } from "@/lib/settings";

export async function GET() {
  try {
    const enabled = await isAccessGateEnabled();
    return jsonOk({ accessGateEnabled: enabled });
  } catch (e) {
    console.error(e);
    return jsonError("Failed to load settings", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const enabled = Boolean(body.accessGateEnabled);
    await setSetting("access_gate_enabled", enabled ? "true" : "false");
    return jsonOk({ accessGateEnabled: enabled });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    console.error(e);
    return jsonError("Failed to update settings", 500);
  }
}
