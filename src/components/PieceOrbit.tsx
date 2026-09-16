"use client";

import { useRef, useState } from "react";

/**
 * Finger-drag orbit viewer for a cut-out piece on a transparent stage.
 * Uses front + soft back (flop) so rotating feels like seeing the other side.
 */
export function PieceOrbit({
  front,
  back,
  label,
  className = "",
}: {
  front: string;
  back?: string | null;
  label?: string;
  className?: string;
}) {
  const [rotY, setRotY] = useState(-18);
  const [rotX, setRotX] = useState(8);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; rotY: number; rotX: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rotY, rotX };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setRotY(drag.current.rotY + dx * 0.45);
    setRotX(Math.max(-28, Math.min(28, drag.current.rotX - dy * 0.25)));
  }

  function onPointerUp() {
    drag.current = null;
    setDragging(false);
  }

  const norm = ((rotY % 360) + 360) % 360;
  const showBack = norm > 90 && norm < 270;
  const src = showBack && back ? back : front;

  return (
    <div
      className={`piece-orbit relative touch-none select-none ${className}`}
      style={{ perspective: "900px" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label={label || "Rotate piece"}
    >
      <div className="absolute inset-0 rounded-2xl bg-white" />
      <div className="checker absolute inset-3 rounded-xl opacity-35" aria-hidden />
      <div
        className="relative z-10 flex h-full w-full items-center justify-center"
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transformStyle: "preserve-3d",
          transition: dragging ? "none" : "transform 180ms ease-out",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label || ""}
          draggable={false}
          className="max-h-[88%] max-w-[88%] object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.28)]"
        />
      </div>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 text-center text-[10px] font-extrabold uppercase tracking-wide text-black/40">
        Official part · drag to spin
      </p>
    </div>
  );
}
