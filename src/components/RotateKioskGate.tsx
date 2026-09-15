"use client";

import { useEffect, useState } from "react";

export function RotateKioskGate({ children }: { children: React.ReactNode }) {
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      {children}
      {landscape && (
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
          <p className="lego-logo relative z-10 text-[clamp(2.2rem,8vw,4rem)] leading-none">
            LEGOTRACK
          </p>
          <h1 className="brand-title relative z-10 max-w-xl text-[clamp(1.6rem,5vw,2.6rem)]">
            Rotate the kiosk
          </h1>
          <p className="soft-copy relative z-10 max-w-md text-[clamp(1.1rem,3vw,1.35rem)]">
            This app works best upright. Turn the iPad to portrait to keep playing.
          </p>
        </div>
      )}
    </>
  );
}
