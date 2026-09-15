import { requireAdmin } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { parseDataUrl, splitMinifigImage } from "@/lib/minifig-split";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const image = String(body.image ?? "");
    if (!image) return jsonError("Image required");

    const buf = parseDataUrl(image);
    const { originalDataUrl, pieces } = await splitMinifigImage(buf);
    const sql = getSql();

    const scanRows = await sql`
      INSERT INTO piece_scans (admin_id, original_image, status)
      VALUES (${admin.id}, ${originalDataUrl}, 'processed')
      RETURNING id
    `;
    const scanId = scanRows[0].id as string;

    const saved = [];
    for (const piece of pieces) {
      const rows = await sql`
        INSERT INTO avatar_pieces (category, label, image_data, source_scan_id)
        VALUES (${piece.category}, ${piece.category}, ${piece.imageDataUrl}, ${scanId})
        RETURNING id, category, label, image_data, source_scan_id, created_at
      `;
      saved.push(rows[0]);
    }

    return jsonOk({
      scanId,
      original: originalDataUrl,
      pieces: saved,
      note: "Full minifigs are always saved as separate hair, head, shirt, and pants pieces.",
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Scan failed", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const id = String(body.id ?? "");
    const category = body.category as string;
    const label = body.label != null ? String(body.label) : null;
    if (!id) return jsonError("id required");
    if (category && !["hair", "head", "shirt", "pants"].includes(category)) {
      return jsonError("Invalid category");
    }
    const sql = getSql();
    if (category && label != null) {
      await sql`UPDATE avatar_pieces SET category = ${category}, label = ${label} WHERE id = ${id}`;
    } else if (category) {
      await sql`UPDATE avatar_pieces SET category = ${category} WHERE id = ${id}`;
    } else if (label != null) {
      await sql`UPDATE avatar_pieces SET label = ${label} WHERE id = ${id}`;
    }
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Update failed", 500);
  }
}
