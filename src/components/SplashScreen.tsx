"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * Official LEGO set PNGs with real transparent backgrounds go here.
 * Until you upload them, the splash shows a clear placeholder — no fake cutouts.
 *
 * Drop files into: public/sets/official/
 * Then add their paths to OFFICIAL_SETS below (or ask me after you upload).
 */
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

/** Classic LEGO primaries — playful packaging energy */
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

/** Tapered sunburst ray: skinny near the set, fat at the edge */
function RayBurst() {
  const cx = 50;
  const cy = 50;
  const innerR = 8; // start a little out from dead center so the set sits in a clear pocket
  const outerR = 78;
  const count = RAY_COLORS.length;
  const halfInnerDeg = 2.2; // narrow near center
  const halfOuterDeg = 9.5; // wide at the rim

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
            strokeWidth="0.35"
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
  const hasSets = OFFICIAL_SETS.length > 0;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!hasSets) return;
    const cycle = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % OFFICIAL_SETS.length);
        setVisible(true);
      }, 450);
    }, 3600);
    return () => clearInterval(cycle);
  }, [hasSets]);

  return (
    <main className="splash relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pb-10 pt-12">
      <div className="pointer-events-none absolute inset-0 bg-[#FFD500]" />
      <div className="splash-studs pointer-events-none absolute inset-0 opacity-30" />

      <h1 className="lego-logo relative z-30 w-full text-center text-[clamp(2.8rem,13vw,5rem)] leading-none">
        LEGOTRACK
      </h1>

      <div className="relative z-10 mt-4 flex w-full flex-1 items-center justify-center">
        {/* Tapered color burst — thin at center, wide at edges */}
        <div className="absolute inset-[-8%] z-0">
          <RayBurst />
        </div>

        {/* Clear pocket for the set so rays feel like they come FROM it */}
        <div className="pointer-events-none absolute z-10 h-[min(42vw,220px)] w-[min(72vw,360px)] rounded-full bg-[#FFD500]" />

        <div className="relative z-20 flex h-[min(52vw,300px)] w-[min(92vw,520px)] items-center justify-center">
          {hasSets ? (
            <div
              className={`flex h-full w-full items-center justify-center transition-opacity duration-500 ${
                visible ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={OFFICIAL_SETS[index]}
                alt="Lego set"
                width={1100}
                height={900}
                priority
                className="max-h-full max-w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.28)]"
              />
            </div>
          ) : (
            <div className="flex max-w-[280px] flex-col items-center gap-2 rounded-md border-4 border-dashed border-black/40 bg-[#FFD500]/90 px-4 py-6 text-center">
              <p className="lego-logo text-lg leading-none">SET ART</p>
              <p className="text-sm font-bold text-black/80">
                Upload official Lego set PNGs with transparent backgrounds — I
                don&apos;t have those files.
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/auth")}
        className="lego-btn relative z-30 mt-4 w-full max-w-sm"
      >
        Continue
      </button>
    </main>
  );
}
