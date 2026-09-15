import { getSession } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const sql = getSql();

  const rows = await sql`
    SELECT
      p.id,
      p.kind,
      p.title,
      p.description,
      p.image_data,
      p.created_at,
      p.owner_id,
      ou.name AS owner_name,
      ou.job AS owner_job,
      p.source_build_id,
      b.user_id AS builder_id,
      bu.name AS builder_name
    FROM city_properties p
    JOIN users ou ON ou.id = p.owner_id
    LEFT JOIN build_submissions b ON b.id = p.source_build_id
    LEFT JOIN users bu ON bu.id = b.user_id
    ORDER BY p.created_at DESC
  `;

  const items = (rows as Array<Record<string, unknown>>).filter((r) =>
    kind && kind !== "all" ? r.kind === kind : true
  );

  return jsonOk({ items });
}
