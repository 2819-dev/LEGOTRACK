"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SETS = [
  "/sets/1.jpg",
  "/sets/2.jpg",
  "/sets/3.jpg",
  "/sets/4.jpg",
  "/sets/6.jpg",
];

const STRIP_COLORS = [
  "#E3000B", // red
  "#FFD500", // yellow
  "#0055BF", // blue
  "#00AF4D", // green
  "#FFFFFF", // white
  "#000000", // black
  "#FF6D00", // orange
];

export function SplashScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % SETS.length);
        setVisible(true);
      }, 500);
    }, 3800);
    return () => clearInterval(cycle);
  }, []);

  return (
    <main className="splash relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pb-10 pt-10">
      {/* Solid classic LEGO yellow field — no glass, no flash */}
      <div className="pointer-events-none absolute inset-0 bg-[#FFD500]" />
      <div className="splash-studs pointer-events-none absolute inset-0 opacity-35" />

      <h1 className="lego-logo relative z-20 text-center text-[clamp(2.75rem,12vw,4.75rem)] leading-none text-black">
        LEGOTRACK
      </h1>

      <div className="relative z-10 mt-8 flex w-full flex-1 items-center justify-center">
        {/* Color strips streaming in from the sides toward the set */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-center">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            {STRIP_COLORS.map((color, i) => (
              <div
                key={`L-${color}-${i}`}
                className="strip strip-from-left absolute h-3 rounded-sm border border-black/20 sm:h-3.5"
                style={{
                  backgroundColor: color,
                  top: `${(i - 3) * 18}px`,
                  animationDelay: `${i * 0.18}s`,
                  width: "42%",
                }}
              />
            ))}
            {STRIP_COLORS.map((color, i) => (
              <div
                key={`R-${color}-${i}`}
                className="strip strip-from-right absolute right-0 h-3 rounded-sm border border-black/20 sm:h-3.5"
                style={{
                  backgroundColor: color,
                  top: `${(i - 3) * 18}px`,
                  animationDelay: `${0.12 + i * 0.18}s`,
                  width: "42%",
                }}
              />
            ))}
          </div>
        </div>

        {/* Real Lego set photo — fades to the next */}
        <div
          className={`relative z-10 h-[min(58vw,320px)] w-[min(58vw,320px)] overflow-hidden border-[5px] border-black bg-white shadow-[6px_6px_0_#000] transition-opacity duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={SETS[index]}
            alt="Lego set"
            fill
            priority
            sizes="320px"
            className="object-cover"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/auth")}
        className="lego-btn relative z-20 mt-10 w-full max-w-sm"
      >
        Continue
      </button>
    </main>
  );
}
