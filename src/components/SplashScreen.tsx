"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SET_ILLUSTRATIONS } from "./SetIllustrations";

const COLORS = ["#E3000B", "#FFD500", "#0055BF", "#00A650", "#FF6B00", "#fff"];

export function SplashScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    const flashTimer = setInterval(() => {
      setFlash((f) => (f + 1) % COLORS.length);
    }, 420);
    return () => clearInterval(flashTimer);
  }, []);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SET_ILLUSTRATIONS.length);
        setVisible(true);
      }, 450);
    }, 3200);
    return () => clearInterval(cycle);
  }, []);

  const set = SET_ILLUSTRATIONS[index];

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6 pb-10 pt-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-90 transition-colors duration-500"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, ${COLORS[flash]}55, transparent 45%),
            radial-gradient(circle at 80% 30%, ${COLORS[(flash + 2) % COLORS.length]}44, transparent 40%),
            radial-gradient(circle at 50% 80%, ${COLORS[(flash + 4) % COLORS.length]}33, transparent 50%),
            linear-gradient(165deg, #1a1a1a 0%, #2b2b2b 40%, #111 100%)
          `,
        }}
      />
      <div className="stud-grid pointer-events-none absolute inset-0 opacity-25" />

      <h1 className="brand-title relative z-10 text-center text-5xl tracking-[0.08em] text-white drop-shadow-[4px_4px_0_#000] sm:text-6xl">
        LEGOTRACK
      </h1>
      <p className="relative z-10 mt-3 max-w-xs text-center text-sm text-white/80">
        Basement city check-in
      </p>

      <div className="relative z-10 mt-10 flex flex-1 items-center justify-center">
        <div
          className="absolute h-72 w-72 rounded-full blur-2xl transition-colors duration-500"
          style={{ backgroundColor: `${COLORS[flash]}66` }}
        />
        <div
          className={`relative h-64 w-64 rounded-3xl border-4 border-black bg-white/95 p-4 shadow-[8px_8px_0_#000] transition-all duration-500 ${
            visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {set.svg}
          <p className="absolute inset-x-0 -bottom-10 text-center text-sm font-semibold text-white">
            {set.title}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/auth")}
        className="lego-btn relative z-10 mt-16 w-full max-w-sm"
      >
        Continue
      </button>
    </main>
  );
}
