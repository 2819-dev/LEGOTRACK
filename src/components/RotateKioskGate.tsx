"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isAdminAllowedPath, isIPad9FamilyKiosk } from "@/lib/device";
import { LegoLogo } from "@/components/LegoLogo";

export function RotateKioskGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [landscape, setLandscape] = useState(false);
  const [enforce, setEnforce] = useState(false);

  useEffect(() => {
    // Only enforce rotate-to-portrait on the real iPad kiosk — not admin phones.
    setEnforce(isIPad9FamilyKiosk() && !isAdminAllowedPath(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!enforce) {
      setLandscape(false);
      return;
    }
    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, [enforce]);

  return (
    <>
      {children}
      {landscape && enforce && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#FFD500] px-8 text-center"
          role="dialog"
          aria-modal="true"
          aria-label="Rotate the kiosk"
        >
          <div className="splash-studs pointer-events-none absolute inset-0 opacity-25" />
          <div
            className="relative z-10 flex h-28 w-20 items-center justify-center rounded-2xl border-4 border-black bg-white shadow-[6px_6px_0_#111] sm:h-32 sm:w-24"
            aria-hidden
          >
            <span className="brand-title text-3xl leading-none sm:text-4xl">↪</span>
          </div>
          <LegoLogo className="relative z-10 text-[clamp(2.2rem,8vw,4rem)] leading-none" />
          <h1 className="brand-title relative z-10 max-w-xl text-[clamp(1.6rem,5vw,2.6rem)]">
            Rotate the kiosk
          </h1>
          <p className="soft-copy relative z-10 max-w-md text-[clamp(1.1rem,3vw,1.35rem)]">
            This app works upright on the iPad. Turn it to portrait to keep playing.
          </p>
        </div>
      )}
    </>
  );
}
