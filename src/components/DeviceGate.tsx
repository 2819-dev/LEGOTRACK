"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isAdminAllowedPath,
  isIPad9FamilyKiosk,
} from "@/lib/device";

type Mode = "checking" | "ok" | "denied" | "admin-phone";

export function DeviceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<Mode>("checking");

  useEffect(() => {
    const kiosk = isIPad9FamilyKiosk();
    if (kiosk) {
      setMode("ok");
      return;
    }
    if (isAdminAllowedPath(pathname)) {
      setMode("admin-phone");
      return;
    }
    setMode("denied");
  }, [pathname]);

  if (mode === "checking") {
    return <main className="loading-screen">LEGOTRACK</main>;
  }

  if (mode === "denied") {
    return (
      <main className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-[#111] px-8 text-center">
        <p className="lego-logo text-[clamp(2rem,8vw,3.5rem)] !text-white !text-shadow-none [text-shadow:3px_3px_0_#e3000b]">
          LEGOTRACK
        </p>
        <h1 className="brand-title text-[clamp(1.8rem,6vw,3rem)] text-[var(--brick-yellow)]">
          Access denied
        </h1>
        <p className="max-w-md text-base font-bold leading-relaxed text-white/80 sm:text-lg">
          This city kiosk only runs on the basement Apple iPad (9th generation,
          home button). Admins can open the admin panel from a phone.
        </p>
      </main>
    );
  }

  return (
    <div data-device-mode={mode} className={mode === "admin-phone" ? "admin-phone" : ""}>
      {children}
    </div>
  );
}
