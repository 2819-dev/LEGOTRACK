import { requireUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const sql = getSql();
    const incoming = await sql`
      SELECT r.id, r.piece_id, r.status, r.created_at,
        p.label AS piece_label, p.category, p.image_data,
        u.name AS from_name, u.id AS from_user_id
      FROM piece_requests r
      JOIN avatar_pieces p ON p.id = r.piece_id
      JOIN users u ON u.id = r.from_user_id
      WHERE r.to_user_id = ${user.id} AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `;
    const outgoing = await sql`
      SELECT r.id, r.piece_id, r.status, r.created_at,
        p.label AS piece_label, p.category, p.image_data,
        u.name AS to_name, u.id AS to_user_id
      FROM piece_requests r
      JOIN avatar_pieces p ON p.id = r.piece_id
      JOIN users u ON u.id = r.to_user_id
      WHERE r.from_user_id = ${user.id} AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `;
    return jsonOk({ incoming, outgoing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError("Failed", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const pieceId = String(body.pieceId ?? "").trim();
    if (!pieceId) return jsonError("pieceId required");

    const sql = getSql();
    const holders = await sql`
      SELECT u.id, u.name
      FROM avatars a
      JOIN users u ON u.id = a.user_id
      WHERE a.helmet_id = ${pieceId} OR a.hair_id = ${pieceId} OR a.head_id = ${pieceId}
         OR a.shirt_id = ${pieceId} OR a.pants_id = ${pieceId} OR a.accessory_id = ${pieceId}
      LIMIT 1
    `;
    if (!holders[0]) return jsonError("This piece is not currently in use", 400);
    const toUserId = holders[0].id as string;
    if (toUserId === user.id) return jsonError("You already have this piece");

    const existing = await sql`
      SELECT id FROM piece_requests
      WHERE piece_id = ${pieceId} AND from_user_id = ${user.id} AND status = 'pending'
      LIMIT 1
    `;
    if (existing[0]) return jsonError("You already requested this piece");

    const rows = await sql`
      INSERT INTO piece_requests (piece_id, from_user_id, to_user_id, status)
      VALUES (${pieceId}, ${user.id}, ${toUserId}, 'pending')
      RETURNING id, piece_id, status, created_at
    `;
    return jsonOk({
      request: rows[0],
      toName: holders[0].name,
      note: `Request sent to ${holders[0].name}.`,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError("Could not send request", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "");
    if (!id) return jsonError("id required");
    if (action !== "approve" && action !== "decline") {
      return jsonError("action must be approve or decline");
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, piece_id, from_user_id, to_user_id, status
      FROM piece_requests WHERE id = ${id} LIMIT 1
    `;
    const reqRow = rows[0] as
      | {
          id: string;
          piece_id: string;
          from_user_id: string;
          to_user_id: string;
          status: string;
        }
      | undefined;
    if (!reqRow) return jsonError("Not found", 404);
    if (reqRow.to_user_id !== user.id) return jsonError("Forbidden", 403);
    if (reqRow.status !== "pending") return jsonError("Already handled");

    if (action === "decline") {
      await sql`UPDATE piece_requests SET status = 'declined' WHERE id = ${id}`;
      return jsonOk({ ok: true, status: "declined" });
    }

    // Approve: clear this piece from the holder's avatar so it becomes available
    const pieceId = reqRow.piece_id;
    await sql`
      UPDATE avatars SET
        helmet_id = CASE WHEN helmet_id = ${pieceId} THEN NULL ELSE helmet_id END,
        hair_id = CASE WHEN hair_id = ${pieceId} THEN NULL ELSE hair_id END,
        head_id = CASE WHEN head_id = ${pieceId} THEN NULL ELSE head_id END,
        shirt_id = CASE WHEN shirt_id = ${pieceId} THEN NULL ELSE shirt_id END,
        pants_id = CASE WHEN pants_id = ${pieceId} THEN NULL ELSE pants_id END,
        accessory_id = CASE WHEN accessory_id = ${pieceId} THEN NULL ELSE accessory_id END,
        updated_at = now()
      WHERE user_id = ${user.id}
    `;
    await sql`UPDATE piece_requests SET status = 'approved' WHERE id = ${id}`;
    return jsonOk({
      ok: true,
      status: "approved",
      note: "Approved.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError("Failed", 500);
  }
}
