"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  hairColor,
  headColor,
  helmetColor,
  pantsColors,
  torsoColors,
  LEGO_PLASTIC,
} from "@/lib/lego-colors";

export type PartInfo = {
  colorKey?: string | null;
  label?: string | null;
} | null;

function plastic(color: string, opts?: { roughness?: number; metalness?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={opts?.roughness ?? 0.38}
      metalness={opts?.metalness ?? 0.04}
    />
  );
}

function Stud({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.09 * scale, 0.09 * scale, 0.08 * scale, 20]} />
      {plastic(color)}
    </mesh>
  );
}

function MinifigHead({
  info,
  position,
}: {
  info?: PartInfo;
  position: [number, number, number];
}) {
  const color = headColor(info?.colorKey, info?.label);
  return (
    <group position={position}>
      {/* Neck post */}
      <mesh position={[0, -0.28, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.13, 0.16, 16]} />
        {plastic(color)}
      </mesh>
      {/* Head cylinder */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.48, 28]} />
        {plastic(color)}
      </mesh>
      {/* Soft top dome */}
      <mesh position={[0, 0.24, 0]} castShadow>
        <sphereGeometry args={[0.34, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {plastic(color)}
      </mesh>
      <Stud position={[0, 0.34, 0]} color={color} scale={1.05} />
      {/* Simple face print (painted, not a photo) */}
      <group position={[0, 0.02, 0.335]}>
        <mesh position={[-0.1, 0.06, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          {plastic("#111111", { roughness: 0.7 })}
        </mesh>
        <mesh position={[0.1, 0.06, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          {plastic("#111111", { roughness: 0.7 })}
        </mesh>
        <mesh position={[0, -0.08, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.08, 0.012, 8, 16, Math.PI]} />
          {plastic("#111111", { roughness: 0.7 })}
        </mesh>
      </group>
    </group>
  );
}

function MinifigHair({
  info,
  position,
}: {
  info?: PartInfo;
  position: [number, number, number];
}) {
  const color = hairColor(info?.colorKey, info?.label);
  const label = (info?.label || "").toLowerCase();
  const female = /female|mid-length|long|ponytail|part over/.test(label);

  return (
    <group position={position}>
      {/* Cap over head */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <sphereGeometry args={[0.38, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        {plastic(color)}
      </mesh>
      {/* Front bangs */}
      <mesh position={[0, 0.05, 0.28]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.62, 0.18, 0.16]} />
        {plastic(color)}
      </mesh>
      {female ? (
        <>
          <mesh position={[-0.28, -0.12, 0.05]} castShadow>
            <boxGeometry args={[0.2, 0.42, 0.28]} />
            {plastic(color)}
          </mesh>
          <mesh position={[0.3, -0.22, 0.02]} castShadow>
            <boxGeometry args={[0.22, 0.55, 0.3]} />
            {plastic(color)}
          </mesh>
        </>
      ) : (
        <mesh position={[0, 0.08, -0.2]} castShadow>
          <boxGeometry args={[0.55, 0.22, 0.28]} />
          {plastic(color)}
        </mesh>
      )}
    </group>
  );
}

function MinifigHelmet({
  info,
  position,
}: {
  info?: PartInfo;
  position: [number, number, number];
}) {
  const color = helmetColor(info?.colorKey, info?.label);
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.4, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
        {plastic(color)}
      </mesh>
      {/* Visor / brim */}
      <mesh position={[0, -0.02, 0.3]} castShadow>
        <boxGeometry args={[0.55, 0.12, 0.2]} />
        {plastic(color)}
      </mesh>
      <mesh position={[0, 0.08, 0.22]} castShadow>
        <boxGeometry args={[0.5, 0.16, 0.08]} />
        {plastic("#1a1a1a", { roughness: 0.25, metalness: 0.35 })}
      </mesh>
    </group>
  );
}

function MinifigTorso({
  info,
  position,
}: {
  info?: PartInfo;
  position: [number, number, number];
}) {
  const { body, arms, hands } = torsoColors(info?.colorKey, info?.label);
  return (
    <group position={position}>
      {/* Chest */}
      <mesh castShadow>
        <boxGeometry args={[0.78, 0.72, 0.42]} />
        {plastic(body)}
      </mesh>
      {/* Slightly wider shoulders */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.88, 0.2, 0.44]} />
        {plastic(body)}
      </mesh>
      {/* Neck socket ring */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.1, 16]} />
        {plastic(body)}
      </mesh>

      {/* Arms */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 0.52, 0.12, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.11, 0.38, 6, 12]} />
            {plastic(arms)}
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.36, 0.02]} castShadow>
            <boxGeometry args={[0.16, 0.14, 0.18]} />
            {plastic(hands)}
          </mesh>
          <mesh position={[0, -0.36, 0.12]} castShadow>
            <torusGeometry args={[0.07, 0.035, 8, 14, Math.PI]} />
            {plastic(hands)}
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MinifigPants({
  info,
  position,
}: {
  info?: PartInfo;
  position: [number, number, number];
}) {
  const { hips, left, right } = pantsColors(info?.colorKey, info?.label);
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.78, 0.28, 0.42]} />
        {plastic(hips)}
      </mesh>
      {/* Legs */}
      <mesh position={[-0.2, -0.42, 0]} castShadow>
        <boxGeometry args={[0.34, 0.58, 0.38]} />
        {plastic(left)}
      </mesh>
      <mesh position={[0.2, -0.42, 0]} castShadow>
        <boxGeometry args={[0.34, 0.58, 0.38]} />
        {plastic(right)}
      </mesh>
      {/* Feet */}
      <mesh position={[-0.2, -0.74, 0.06]} castShadow>
        <boxGeometry args={[0.34, 0.12, 0.5]} />
        {plastic(left)}
      </mesh>
      <mesh position={[0.2, -0.74, 0.06]} castShadow>
        <boxGeometry args={[0.34, 0.12, 0.5]} />
        {plastic(right)}
      </mesh>
    </group>
  );
}

function IdleSpin({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!enabled || !ref.current) return;
    ref.current.rotation.y += dt * 0.35;
  });
  return <group ref={ref}>{children}</group>;
}

function AssembledFig({
  helmet,
  hair,
  head,
  shirt,
  pants,
}: {
  helmet?: PartInfo;
  hair?: PartInfo;
  head?: PartInfo;
  shirt?: PartInfo;
  pants?: PartInfo;
}) {
  const hasTop = Boolean(helmet || hair);
  return (
    <group position={[0, -0.05, 0]}>
      {pants ? <MinifigPants info={pants} position={[0, -0.55, 0]} /> : null}
      {shirt ? <MinifigTorso info={shirt} position={[0, 0.2, 0]} /> : null}
      {head ? <MinifigHead info={head} position={[0, 0.78, 0]} /> : null}
      {helmet ? (
        <MinifigHelmet info={helmet} position={[0, 1.02, 0]} />
      ) : hair ? (
        <MinifigHair info={hair} position={[0, 1.02, 0]} />
      ) : null}
      {/* Placeholder studs when empty so empty state still feels 3D */}
      {!pants && !shirt && !head && !hasTop ? (
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          {plastic(LEGO_PLASTIC)}
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * Assembled minifig from real plastic-colored 3D parts (not catalog photos).
 */
export function Minifig3D({
  helmet,
  hair,
  head,
  shirt,
  pants,
  className = "",
  autoRotate = true,
}: {
  helmet?: PartInfo | string | null;
  hair?: PartInfo | string | null;
  head?: PartInfo | string | null;
  shirt?: PartInfo | string | null;
  pants?: PartInfo | string | null;
  className?: string;
  autoRotate?: boolean;
}) {
  const parts = useMemo(() => {
    const asInfo = (v: PartInfo | string | null | undefined): PartInfo => {
      if (!v) return null;
      if (typeof v === "string") {
        // legacy: image URL only — still show a default-colored part so UI isn't empty
        return { colorKey: null, label: null };
      }
      return v;
    };
    return {
      helmet: asInfo(helmet),
      hair: asInfo(hair),
      head: asInfo(head),
      shirt: asInfo(shirt),
      pants: asInfo(pants),
    };
  }, [helmet, hair, head, shirt, pants]);

  const hasAny = Boolean(parts.helmet || parts.hair || parts.head || parts.shirt || parts.pants);

  return (
    <div
      className={`relative overflow-hidden rounded-[1.35rem] border-4 border-black bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] shadow-[4px_4px_0_#111] ${className}`}
    >
      {!hasAny && (
        <p className="absolute inset-0 z-10 flex items-center justify-center text-xs font-extrabold text-black/35">
          No avatar
        </p>
      )}
      <Canvas
        camera={{ position: [0.9, 0.55, 3.1], fov: 36 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        className="h-full w-full touch-none"
      >
        <color attach="background" args={["#eef2f7"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[3.5, 6, 4]} intensity={1.25} castShadow />
        <directionalLight position={[-4, 2, -2]} intensity={0.4} />
        <hemisphereLight args={["#ffffff", "#94a3b8", 0.35]} />
        <Suspense fallback={null}>
          <IdleSpin enabled={autoRotate && hasAny}>
            <AssembledFig {...parts} />
          </IdleSpin>
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={5}
          minPolarAngle={0.55}
          maxPolarAngle={Math.PI - 0.65}
          target={[0, 0.15, 0]}
        />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] font-extrabold uppercase tracking-wide text-black/40">
        Drag to rotate
      </p>
    </div>
  );
}

function SinglePartModel({
  category,
  info,
}: {
  category: "helmet" | "hair" | "head" | "shirt" | "pants";
  info: PartInfo;
}) {
  switch (category) {
    case "helmet":
      return <MinifigHelmet info={info} position={[0, -0.15, 0]} />;
    case "hair":
      return <MinifigHair info={info} position={[0, -0.15, 0]} />;
    case "head":
      return <MinifigHead info={info} position={[0, 0, 0]} />;
    case "shirt":
      return <MinifigTorso info={info} position={[0, 0, 0]} />;
    case "pants":
      return <MinifigPants info={info} position={[0, 0.15, 0]} />;
    default:
      return null;
  }
}

/**
 * Single piece as real 3D plastic geometry.
 */
export function Piece3D({
  category,
  colorKey,
  label,
  className = "",
}: {
  category: "helmet" | "hair" | "head" | "shirt" | "pants";
  colorKey?: string | null;
  label?: string | null;
  className?: string;
}) {
  const info = { colorKey, label };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-3 border-black bg-white ${className}`}
      role="img"
      aria-label={label || category}
    >
      <Canvas
        camera={{ position: [1.1, 0.4, 2.4], fov: 40 }}
        dpr={[1, 1.75]}
        className="relative z-10 h-full w-full touch-none"
      >
        <color attach="background" args={["#f8fafc"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[2.5, 3, 4]} intensity={1.2} />
        <directionalLight position={[-2, 1, -1]} intensity={0.35} />
        <Suspense fallback={null}>
          <IdleSpin enabled>
            <SinglePartModel category={category} info={info} />
          </IdleSpin>
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.5} maxDistance={4} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 text-center text-[10px] font-extrabold uppercase tracking-wide text-black/40">
        Drag to rotate
      </p>
    </div>
  );
}
