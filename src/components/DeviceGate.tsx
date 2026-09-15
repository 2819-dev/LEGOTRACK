"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isAdminAllowedPath,
  isIPad9FamilyKiosk,
} from "@/lib/device";
import { LegoLogo } from "@/components/LegoLogo";

type Mode = "checking" | "ok" | "denied" | "admin-phone";

export function DeviceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<Mode>("checking");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Admin auth paths always reachable so the toggle / login still works off-kiosk
      if (isAdminAllowedPath(pathname)) {
        if (!cancelled) setMode("admin-phone");
        return;
      }

      if (isIPad9FamilyKiosk()) {
        if (!cancelled) setMode("ok");
        return;
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
        <LegoLogo className="text-[clamp(2rem,8vw,3.5rem)] [text-shadow:3px_3px_0_#e3000b]" />
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
