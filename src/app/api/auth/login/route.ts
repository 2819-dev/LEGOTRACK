import { NextResponse } from "next/server";
import {
  attachSessionCookies,
  findUserByName,
  verifyPassword,
} from "@/lib/auth";
import { isAccessGateEnabled } from "@/lib/settings";
import { jsonError } from "@/lib/api";

function wantsForm(req: Request) {
  const ct = req.headers.get("content-type") || "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
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

    if (!name || !password) {
      if (formMode) {
        return redirectTo(req, "/auth?mode=login&error=" + encodeURIComponent("Name and password required"));
      }
      return jsonError("Name and password required");
    }

    const user = await findUserByName(name);
    if (!user) {
      if (formMode) {
        return redirectTo(
          req,
          "/auth?mode=login&error=" + encodeURIComponent("Wrong name or password")
        );
      }
      return jsonError("Wrong name or password", 401);
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      if (formMode) {
        return redirectTo(
          req,
          "/auth?mode=login&error=" + encodeURIComponent("Wrong name or password")
        );
      }
      return jsonError("Wrong name or password", 401);
    }

    const gateOn = await isAccessGateEnabled();
    if (gateOn && !kiosk && user.role !== "admin") {
      if (formMode) {
        return redirectTo(
          req,
          "/auth?mode=login&error=" +
            encodeURIComponent("Only admin can sign in from this device")
        );
      }
      return jsonError("Only admin can sign in from this device", 403);
    }

    let next = "/home";
    if (user.must_change_password) next = "/change-password";
    else if (user.role === "admin") next = "/admin";

    if (formMode) {
      const res = redirectTo(req, next);
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
      mustChangePassword: Boolean(user.must_change_password),
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
        "/auth?mode=login&error=" + encodeURIComponent("Login failed")
      );
    }
    return jsonError("Login failed", 500);
  }
}
