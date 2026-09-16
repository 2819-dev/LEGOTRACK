import { requireAdmin } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { detectPiecesFromFloorPhoto, parseDataUrl } from "@/lib/piece-vision";
import { compressDataUrl } from "@/lib/images";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const image = String(body.image ?? "");
    const mode = body.mode === "set" ? "set" : "pieces";
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
        note: "Set saved.",
      });
    }

    const buf = parseDataUrl(image);
    const { previewDataUrl, pieces, note } = await detectPiecesFromFloorPhoto(buf);
    const sql = getSql();

    const compressedOriginal = await compressDataUrl(previewDataUrl, {
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
      const existing = piece.partNum
        ? await sql`
            SELECT id, quantity FROM avatar_pieces
            WHERE part_num = ${piece.partNum}
              AND coalesce(brick_color, '') = coalesce(${piece.brickColor}, '')
              AND category = ${piece.category}
            ORDER BY created_at ASC
            LIMIT 1
          `
        : [];

      if (existing[0]) {
        const id = existing[0].id as string;
        const nextQty = Number(existing[0].quantity || 1) + piece.quantity;
        await sql`
          UPDATE avatar_pieces
          SET quantity = ${nextQty},
              label = ${piece.label},
              image_data = ${piece.imageDataUrl},
              image_back = ${piece.imageBackDataUrl},
              color_key = ${piece.colorKey},
              catalog_url = ${piece.catalogUrl},
              part_num = ${piece.partNum},
              brick_color = ${piece.brickColor},
              source_scan_id = ${scanId}
          WHERE id = ${id}
        `;
        const rows = await sql`
          SELECT id, category, label, image_data, image_back, color_key, quantity,
                 part_num, catalog_url, brick_color, source_scan_id, created_at
          FROM avatar_pieces WHERE id = ${id}
        `;
        saved.push(rows[0]);
      } else {
        const rows = await sql`
          INSERT INTO avatar_pieces (
            category, label, image_data, image_back, color_key, quantity,
            part_num, catalog_url, brick_color, source_scan_id
          )
          VALUES (
            ${piece.category},
            ${piece.label},
            ${piece.imageDataUrl},
            ${piece.imageBackDataUrl},
            ${piece.colorKey},
            ${piece.quantity},
            ${piece.partNum},
            ${piece.catalogUrl},
            ${piece.brickColor},
            ${scanId}
          )
          RETURNING id, category, label, image_data, image_back, color_key, quantity,
                    part_num, catalog_url, brick_color, source_scan_id, created_at
        `;
        saved.push(rows[0]);
      }
    }

    return jsonOk({
      mode: "pieces",
      scanId,
      original: compressedOriginal,
      pieces: saved,
      note,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Scan failed. Try a clearer photo.", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const id = String(body.id ?? "");
    const category = body.category as string | undefined;
    const label = body.label != null ? String(body.label) : null;
    const quantity =
      body.quantity != null && body.quantity !== ""
        ? Math.max(1, Math.min(99, Number(body.quantity)))
        : null;
    if (!id) return jsonError("id required");
    if (
      category &&
      !["helmet", "hair", "head", "shirt", "pants"].includes(category)
    ) {
      return jsonError("Invalid category");
    }
    const sql = getSql();
    if (category) {
      await sql`UPDATE avatar_pieces SET category = ${category} WHERE id = ${id}`;
    }
    if (label != null) {
      await sql`UPDATE avatar_pieces SET label = ${label} WHERE id = ${id}`;
    }
    if (quantity != null && !Number.isNaN(quantity)) {
      await sql`UPDATE avatar_pieces SET quantity = ${quantity} WHERE id = ${id}`;
    }
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Update failed", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();
    if (!id) return jsonError("id required");
    const sql = getSql();
    await sql`
      UPDATE avatars SET
        helmet_id = CASE WHEN helmet_id = ${id} THEN NULL ELSE helmet_id END,
        hair_id = CASE WHEN hair_id = ${id} THEN NULL ELSE hair_id END,
        head_id = CASE WHEN head_id = ${id} THEN NULL ELSE head_id END,
        shirt_id = CASE WHEN shirt_id = ${id} THEN NULL ELSE shirt_id END,
        pants_id = CASE WHEN pants_id = ${id} THEN NULL ELSE pants_id END
    `;
    await sql`DELETE FROM avatar_pieces WHERE id = ${id}`;
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Delete failed", 500);
  }
}
