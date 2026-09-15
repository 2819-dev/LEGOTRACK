import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

type PropertyRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  image_data: string;
  created_at: string;
  owner_id: string;
  owner_name: string;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  const sql = getSql();

  if (mine) {
    const rows = await sql`
      SELECT p.*, u.name AS owner_name
      FROM city_properties p
      JOIN users u ON u.id = p.owner_id
      WHERE p.owner_id = ${session.id}
      ORDER BY p.created_at DESC
    `;
    return jsonOk({ properties: rows });
  }

  const rows = (await sql`
    SELECT p.id, p.kind, p.title, p.description, p.image_data, p.created_at,
      p.owner_id, u.name AS owner_name
    FROM city_properties p
    JOIN users u ON u.id = p.owner_id
    ORDER BY u.name ASC, p.created_at DESC
  `) as PropertyRow[];

  const byOwner: Record<
    string,
    { owner_id: string; owner_name: string; items: PropertyRow[] }
  > = {};
  for (const row of rows) {
    if (!byOwner[row.owner_id]) {
      byOwner[row.owner_id] = {
        owner_id: row.owner_id,
        owner_name: row.owner_name,
        items: [],
      };
    }
    byOwner[row.owner_id].items.push(row);
  }

  return jsonOk({
    properties: rows,
    owners: Object.values(byOwner),
  });
}
