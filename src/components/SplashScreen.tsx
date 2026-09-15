"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/** Drop more transparent PNGs in /public/sets/cutouts — they will cycle automatically. */
const SETS = [
  "/sets/cutouts/4.png",
  "/sets/cutouts/2.png",
  "/sets/cutouts/1.png",
  "/sets/cutouts/3.png",
];

/** Official-ish LEGO primary palette for radial rays */
const RAY_COLORS = [
  "#E3000B",
  "#FFD500",
  "#0055BF",
  "#00AF4D",
  "#FFFFFF",
  "#FF6D00",
  "#000000",
  "#E3000B",
  "#0055BF",
  "#FFD500",
  "#00AF4D",
  "#FFFFFF",
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
      }, 450);
    }, 3600);
    return () => clearInterval(cycle);
  }, []);

  return (
    <main className="splash relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pb-10 pt-12">
      {/* Fun professional yellow field + stud texture */}
      <div className="pointer-events-none absolute inset-0 bg-[#FFD500]" />
      <div className="splash-studs pointer-events-none absolute inset-0 opacity-35" />

      <h1 className="lego-logo relative z-30 w-full text-center text-[clamp(2.8rem,13vw,5rem)] leading-none">
        LEGOTRACK
      </h1>

      {/* Stage: rays burst from center + floating transparent set */}
      <div className="relative z-10 mt-6 flex w-full flex-1 items-center justify-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          {RAY_COLORS.map((color, i) => {
            const angle = (360 / RAY_COLORS.length) * i - 90;
            return (
              <div
                key={`${color}-${i}`}
                className="ray"
                style={{
                  backgroundColor: color,
                  transform: `rotate(${angle}deg)`,
                }}
              />
            );
          })}
        </div>

        {/* Soft yellow disc so the set pops over the rays */}
        <div className="pointer-events-none absolute h-[min(70vw,380px)] w-[min(70vw,380px)] rounded-full bg-[#FFD500]/80" />

        <div
          className={`relative z-20 flex h-[min(62vw,340px)] w-[min(62vw,340px)] items-center justify-center transition-opacity duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={SETS[index]}
            alt="Lego set"
            width={680}
            height={680}
            priority
            className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/auth")}
        className="lego-btn relative z-30 mt-6 w-full max-w-sm"
      >
        Continue
      </button>
    </main>
  );
}
