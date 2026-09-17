import { NextResponse } from "next/server";
import {
  attachSessionCookies,
  findUserByName,
  hashPassword,
} from "@/lib/auth";
import { getSql } from "@/lib/db";
import { isAccessGateEnabled } from "@/lib/settings";
import { jsonError } from "@/lib/api";

function wantsForm(req: Request) {
  const ct = req.headers.get("content-type") || "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

function publicOrigin(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost && !forwardedHost.includes("--")) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  if (process.env.URL) return process.env.URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return new URL(req.url).origin;
}

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, publicOrigin(req)), 303);
}

export async function POST(req: Request) {
  const formMode = wantsForm(req);
  try {
    let name = "";
    let password = "";
    let kiosk = false;

    if (formMode) {
      const form = await req.formData();
      name = String(form.get("name") ?? "").trim();
      password = String(form.get("password") ?? "");
      kiosk = String(form.get("kiosk") ?? "") === "1";
    } else {
      const body = await req.json();
      name = String(body.name ?? "").trim();
      password = String(body.password ?? "");
      kiosk = body.kiosk === true;
    }

    const gateOn = await isAccessGateEnabled();
    if (gateOn && !kiosk) {
      if (formMode) {
        return redirectTo(
          req,
          "/auth?mode=register&error=" +
            encodeURIComponent("Registration is closed on this device")
        );
      }
      return jsonError("Registration is closed on this device", 403);
    }

    if (name.length < 2) {
      if (formMode) {
        return redirectTo(
          req,
          "/auth?mode=register&error=" +
            encodeURIComponent("Name must be at least 2 characters")
        );
      }
      return jsonError("Name must be at least 2 characters");
    }
    if (password.length < 3) {
      if (formMode) {
        return redirectTo(
          req,
          "/auth?mode=register&error=" +
            encodeURIComponent("Password must be at least 3 characters")
        );
      }
      return jsonError("Password must be at least 3 characters");
    }

    const existing = await findUserByName(name);
    if (existing) {
      if (formMode) {
        return redirectTo(
          req,
          "/auth?mode=register&error=" +
            encodeURIComponent("That name is already taken")
        );
      }
      return jsonError("That name is already taken", 409);
    }

    const password_hash = await hashPassword(password);
    const sql = getSql();
    const rows = await sql`
      INSERT INTO users (name, password_hash, password_plain, role, must_change_password)
      VALUES (${name}, ${password_hash}, ${password}, 'player', false)
      RETURNING id, name, role
    `;
    const user = rows[0] as { id: string; name: string; role: "player" };
    await sql`
      INSERT INTO avatars (user_id) VALUES (${user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    if (formMode) {
      const res = redirectTo(req, "/avatar?onboarding=1");
      await attachSessionCookies(res, {
        id: user.id,
        name: user.name,
        role: user.role,
      });
      return res;
    }

    const res = NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      needsAvatar: true,
    });
    await attachSessionCookies(res, {
      id: user.id,
      name: user.name,
      role: user.role,
    });
    return res;
  } catch (e) {
    console.error(e);
    if (formMode) {
      return redirectTo(
        req,
        "/auth?mode=register&error=" +
          encodeURIComponent("Could not create account")
      );
    }
    return jsonError("Could not create account", 500);
  }
}
