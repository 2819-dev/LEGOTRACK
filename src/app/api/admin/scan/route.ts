import { requireAdmin } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { parseDataUrl, splitMinifigImage } from "@/lib/minifig-split";
import { compressDataUrl } from "@/lib/images";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const image = String(body.image ?? "");
    const mode = body.mode === "set" ? "set" : "minifig";
    if (!image) return jsonError("Image required");

    if (mode === "set") {
      const name = String(body.name ?? "Scanned set").trim() || "Scanned set";
      const image_data = await compressDataUrl(image, { maxWidth: 1400, quality: 82 });
      const sql = getSql();
      const rows = await sql`
        INSERT INTO catalog_sets (name, image_data, notes, created_by)
        VALUES (${name}, ${image_data}, ${"Scanned in admin"}, ${admin.id})
        RETURNING id, name, image_data, notes, created_at
      `;
      return jsonOk({
        mode: "set",
        set: rows[0],
        note: "Approved set saved to the city catalog. Assign an owner from the Sets tab.",
      });
    }

    const buf = parseDataUrl(image);
    const { originalDataUrl, pieces } = await splitMinifigImage(buf);
    const sql = getSql();

    const compressedOriginal = await compressDataUrl(originalDataUrl, {
      maxWidth: 900,
      quality: 80,
    });

    const scanRows = await sql`
      INSERT INTO piece_scans (admin_id, original_image, status)
      VALUES (${admin.id}, ${compressedOriginal}, 'processed')
      RETURNING id
    `;
    const scanId = scanRows[0].id as string;

    const saved = [];
    for (const piece of pieces) {
      const compressed = await compressDataUrl(piece.imageDataUrl, {
        maxWidth: 480,
        quality: 82,
      });
      const rows = await sql`
        INSERT INTO avatar_pieces (category, label, image_data, source_scan_id)
        VALUES (${piece.category}, ${piece.category}, ${compressed}, ${scanId})
        RETURNING id, category, label, image_data, source_scan_id, created_at
      `;
      saved.push(rows[0]);
    }

    return jsonOk({
      mode: "minifig",
      scanId,
      original: compressedOriginal,
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
