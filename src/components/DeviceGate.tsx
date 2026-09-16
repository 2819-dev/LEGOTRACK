"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isAdminAllowedPath,
  isIPad9FamilyKiosk,
  isPublicPath,
} from "@/lib/device";
import { LegoLogo } from "@/components/LegoLogo";

type Mode = "checking" | "ok" | "denied" | "admin-phone";

export function DeviceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<Mode>("checking");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Splash + auth stay reachable so people can sign in when the gate is on.
      if (isPublicPath(pathname)) {
        if (!cancelled) setMode(isAdminAllowedPath(pathname) ? "admin-phone" : "ok");
        return;
      }

      // Admin panel always reachable so the gate toggle works off-kiosk
      if (isAdminAllowedPath(pathname)) {
        if (!cancelled) setMode("admin-phone");
        return;
      }

      if (isIPad9FamilyKiosk()) {
        if (!cancelled) setMode("ok");
        return;
      }

      // Signed-in admins may use the full app (including player mode) from any device.
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me = await meRes.json();
        if (me?.canAdmin || me?.realUser?.role === "admin") {
          if (!cancelled) setMode("admin-phone");
          return;
        }
      } catch {
        // Fall through to gate check
      }

      let gateOn = false;
      try {
        const res = await fetch("/api/settings/access-gate", { cache: "no-store" });
        const data = await res.json();
        gateOn = Boolean(data.accessGateEnabled);
      } catch {
        // If settings fail, stay open so phones/iPhones aren't locked out accidentally
        gateOn = false;
      }

      if (cancelled) return;
      setMode(gateOn ? "denied" : "ok");
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (mode === "checking") {
    return <main className="loading-screen">LEGOTRACK</main>;
  }

  if (mode === "denied") {
    return (
      <main className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-[#111] px-8 text-center">
        <LegoLogo className="text-[clamp(2rem,8vw,3.5rem)]" />
        <h1 className="brand-title text-[clamp(1.8rem,6vw,3rem)] text-[var(--brick-yellow)]">
          Access denied
        </h1>
        <Link
          href="/auth"
          className="absolute right-2 bottom-2 text-[9px] font-bold tracking-wide text-white/25"
        >
          admin
        </Link>
      </main>
    );
  }

  return (
    <div data-device-mode={mode} className={mode === "admin-phone" ? "admin-phone" : ""}>
      {children}
    </div>
  );
}
