import { getSql } from "@/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key} LIMIT 1`;
  return (rows[0] as { value: string } | undefined)?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const sql = getSql();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

export async function isAccessGateEnabled(): Promise<boolean> {
  const value = await getSetting("access_gate_enabled");
  // Default open while temporarily allowing phones / iPhones
  if (value == null) return false;
  return value === "true" || value === "1";
}
