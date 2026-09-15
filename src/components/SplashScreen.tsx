"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const OFFICIAL_SETS: string[] = [
  "/sets/official/set-01.png",
  "/sets/official/set-02.png",
  "/sets/official/set-03.png",
  "/sets/official/set-04.png",
  "/sets/official/set-05.png",
  "/sets/official/set-06.png",
  "/sets/official/set-07.png",
  "/sets/official/set-08.png",
  "/sets/official/set-09.png",
];

const RAY_COLORS = [
  "#E3000B",
  "#FFD500",
  "#0055BF",
  "#00AF4D",
  "#FFFFFF",
  "#FF6D00",
  "#E3000B",
  "#0055BF",
  "#FFD500",
  "#00AF4D",
  "#FFFFFF",
  "#000000",
];

function RayBurst() {
  const cx = 50;
  const cy = 48;
  const innerR = 6;
  const outerR = 95;
  const count = RAY_COLORS.length;
  const halfInnerDeg = 2.2;
  const halfOuterDeg = 10.5;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r: number) => {
    const a = toRad(deg - 90);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {RAY_COLORS.map((color, i) => {
        const mid = (360 / count) * i;
        const [x1, y1] = pt(mid - halfInnerDeg, innerR);
        const [x2, y2] = pt(mid + halfInnerDeg, innerR);
        const [x3, y3] = pt(mid + halfOuterDeg, outerR);
        const [x4, y4] = pt(mid - halfOuterDeg, outerR);
        return (
          <polygon
            key={`${color}-${i}`}
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
            fill={color}
            stroke="#111"
            strokeWidth="0.3"
            strokeLinejoin="round"
            opacity={color === "#FFFFFF" ? 0.95 : 1}
          />
        );
      })}
    </svg>
  );
}

export function SplashScreen() {
  const router = useRouter();
  const indexRef = useRef(0);
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(0);
  const [crossfading, setCrossfading] = useState(false);

  useEffect(() => {
    if (OFFICIAL_SETS.length < 2) return;

    let fadeTimer: number | undefined;
    const interval = window.setInterval(() => {
      const cur = indexRef.current;
      const nxt = (cur + 1) % OFFICIAL_SETS.length;
      setNext(nxt);
      setCrossfading(true);
      fadeTimer = window.setTimeout(() => {
        indexRef.current = nxt;
        setCurrent(nxt);
        setCrossfading(false);
      }, 750);
    }, 4200);

    return () => {
      window.clearInterval(interval);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <main className="splash relative flex min-h-dvh flex-col items-center overflow-hidden px-[max(1.25rem,env(safe-area-inset-left))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
      {/* Full-bleed rays — edge to edge, above title and behind Continue */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#FFD500]" />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute inset-[-20%] sm:inset-[-12%]">
          <RayBurst />
        </div>
      </div>
      <div className="splash-studs pointer-events-none absolute inset-0 z-[2] opacity-20" />

      <h1 className="splash-title relative z-30 mt-1 w-full max-w-[42rem] px-1 text-center text-[clamp(3.4rem,13vw,5.75rem)] leading-[0.9]">
        LEGO
        <span className="block">TRACK</span>
      </h1>

      <div className="relative z-20 mt-3 flex w-full max-w-[42rem] flex-1 items-center justify-center sm:mt-4">
        <div className="pointer-events-none absolute z-10 h-[min(30dvh,260px)] w-[min(82vw,460px)] rounded-full bg-[#FFD500]/80 blur-[1px]" />

        <div className="relative z-20 h-[min(44dvh,440px)] w-full max-w-[36rem]">
          <Image
            src={OFFICIAL_SETS[current]}
            alt=""
            width={1100}
            height={900}
            priority
            className="absolute inset-0 m-auto max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.32)]"
          />
          <Image
            src={OFFICIAL_SETS[next]}
            alt="Lego set"
            width={1100}
            height={900}
            priority
            className={`absolute inset-0 m-auto max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.32)] transition-opacity duration-700 ease-in-out ${
              crossfading ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/auth")}
        className="lego-btn lego-btn-yellow relative z-30 mt-4 w-full max-w-md sm:mt-5"
      >
        Continue
      </button>
    </main>
  );
}
