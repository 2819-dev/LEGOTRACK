import { requireAdmin, getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

async function exclusiveClaimCount(sql: ReturnType<typeof getSql>, exclusiveId: string) {
  const rows = await sql`
    SELECT count(*)::int AS n FROM avatars WHERE exclusive_id = ${exclusiveId}
  `;
  return Number((rows[0] as { n: number }).n || 0);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonError("Unauthorized", 401);
    const sql = getSql();
    const rows = await sql`
      SELECT e.id, e.name, e.quantity, e.created_at,
        e.helmet_id, e.hair_id, e.head_id, e.shirt_id, e.pants_id,
        he.image_data AS helmet_image, he.image_back AS helmet_back,
        h.image_data AS hair_image, h.image_back AS hair_back,
        d.image_data AS head_image, d.image_back AS head_back,
        s.image_data AS shirt_image, s.image_back AS shirt_back,
        p.image_data AS pants_image, p.image_back AS pants_back,
        (
          SELECT count(*)::int FROM avatars a WHERE a.exclusive_id = e.id
        ) AS taken_count
      FROM exclusive_minifigs e
      LEFT JOIN avatar_pieces he ON he.id = e.helmet_id
      LEFT JOIN avatar_pieces h ON h.id = e.hair_id
      LEFT JOIN avatar_pieces d ON d.id = e.head_id
      LEFT JOIN avatar_pieces s ON s.id = e.shirt_id
      LEFT JOIN avatar_pieces p ON p.id = e.pants_id
      ORDER BY e.created_at DESC
    `;
    const exclusives = rows.map((r) => {
      const row = r as {
        quantity: number;
        taken_count: number;
      } & Record<string, unknown>;
      const qty = Number(row.quantity || 1);
      const taken = Number(row.taken_count || 0);
      return {
        ...row,
        available: Math.max(0, qty - taken),
        isTaken: taken >= qty,
      };
    });
    return jsonOk({ exclusives });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError("Failed", 500);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const name = String(body.name ?? "").trim() || "Exclusive minifig";
    const helmet_id = body.helmet_id ? String(body.helmet_id) : null;
    const hair_id = body.hair_id ? String(body.hair_id) : null;
    const head_id = body.head_id ? String(body.head_id) : null;
    const shirt_id = body.shirt_id ? String(body.shirt_id) : null;
    const pants_id = body.pants_id ? String(body.pants_id) : null;
    const quantity = Math.max(1, Math.min(99, Number(body.quantity) || 1));

    if (!head_id || !shirt_id || !pants_id) {
      return jsonError("Head, shirt, and pants are required");
    }
    if (!helmet_id && !hair_id) {
      return jsonError("Helmet or hair is required");
    }

    const sql = getSql();
    const pieceIds = [helmet_id, hair_id, head_id, shirt_id, pants_id].filter(
      Boolean
    ) as string[];

    for (const pid of pieceIds) {
      const locked = await sql`
        SELECT id FROM avatar_pieces
        WHERE id = ${pid} AND exclusive_minifig_id IS NOT NULL
        LIMIT 1
      `;
      if (locked[0]) {
        return jsonError("One or more pieces are already in an exclusive minifig");
      }
    }

    const rows = await sql`
      INSERT INTO exclusive_minifigs (
        name, helmet_id, hair_id, head_id, shirt_id, pants_id, quantity
      )
      VALUES (
        ${name}, ${helmet_id}, ${hair_id}, ${head_id}, ${shirt_id}, ${pants_id}, ${quantity}
      )
      RETURNING id, name, helmet_id, hair_id, head_id, shirt_id, pants_id, quantity, created_at
    `;
    const exclusive = rows[0] as { id: string };

    for (const id of pieceIds) {
      await sql`
        UPDATE avatar_pieces SET exclusive_minifig_id = ${exclusive.id} WHERE id = ${id}
      `;
    }

    return jsonOk({ exclusive: rows[0] });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Could not create exclusive minifig", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) return jsonError("id required");
    const sql = getSql();

    if (body.quantity != null) {
      const quantity = Math.max(1, Math.min(99, Number(body.quantity)));
      await sql`UPDATE exclusive_minifigs SET quantity = ${quantity} WHERE id = ${id}`;
    }
    if (body.name != null) {
      const name = String(body.name).trim() || "Exclusive minifig";
      await sql`UPDATE exclusive_minifigs SET name = ${name} WHERE id = ${id}`;
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
    await sql`UPDATE avatars SET exclusive_id = NULL WHERE exclusive_id = ${id}`;
    await sql`UPDATE avatar_pieces SET exclusive_minifig_id = NULL WHERE exclusive_minifig_id = ${id}`;
    await sql`DELETE FROM exclusive_minifigs WHERE id = ${id}`;
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (msg === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError("Delete failed", 500);
  }
}

/** Equip an exclusive minifig (player). */
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonError("Unauthorized", 401);
    const body = await req.json();
    const exclusiveId = body.exclusiveId ? String(body.exclusiveId) : null;
    const sql = getSql();

    if (!exclusiveId) {
      await sql`
        UPDATE avatars SET exclusive_id = NULL, updated_at = now()
        WHERE user_id = ${session.id}
      `;
      return jsonOk({ ok: true, cleared: true });
    }

    const rows = await sql`
      SELECT id, helmet_id, hair_id, head_id, shirt_id, pants_id, quantity
      FROM exclusive_minifigs WHERE id = ${exclusiveId} LIMIT 1
    `;
    if (!rows[0]) return jsonError("Not found", 404);
    const ex = rows[0] as {
      id: string;
      helmet_id: string | null;
      hair_id: string | null;
      head_id: string | null;
      shirt_id: string | null;
      pants_id: string | null;
      quantity: number;
    };

    const current = await sql`
      SELECT exclusive_id FROM avatars WHERE user_id = ${session.id} LIMIT 1
    `;
    const curEx = (current[0] as { exclusive_id: string | null } | undefined)?.exclusive_id;
    if (curEx !== exclusiveId) {
      const taken = await exclusiveClaimCount(sql, exclusiveId);
      if (taken >= Number(ex.quantity || 1)) {
        return jsonError("This exclusive minifig is unavailable", 409);
      }
    }

    await sql`
      INSERT INTO avatars (
        user_id, helmet_id, hair_id, head_id, shirt_id, pants_id, exclusive_id, updated_at
      )
      VALUES (
        ${session.id}, ${ex.helmet_id}, ${ex.hair_id}, ${ex.head_id},
        ${ex.shirt_id}, ${ex.pants_id}, ${exclusiveId}, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        helmet_id = EXCLUDED.helmet_id,
        hair_id = EXCLUDED.hair_id,
        head_id = EXCLUDED.head_id,
        shirt_id = EXCLUDED.shirt_id,
        pants_id = EXCLUDED.pants_id,
        exclusive_id = EXCLUDED.exclusive_id,
        updated_at = now()
    `;
    return jsonOk({ ok: true, exclusiveId });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError("Failed", 500);
  }
}
