import { NextResponse } from "next/server";
import { attachClearSessionCookies, destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
  } catch {
    // Still clear cookies via response if jar delete fails
  }
  const res = NextResponse.json({ ok: true });
  return attachClearSessionCookies(res);
}
