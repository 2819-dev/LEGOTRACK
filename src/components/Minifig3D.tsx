"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { primaryPartColor, LEGO_PLASTIC } from "@/lib/lego-colors";

export type PartInfo = {
  front?: string | null;
  back?: string | null;
  colorKey?: string | null;
  label?: string | null;
  category?: "helmet" | "hair" | "head" | "shirt" | "pants" | "accessory";
} | null;

function useCutoutTexture(url: string | null | undefined) {
  const safe = url && url.length > 32 ? url : null;
  const texture = useLoader(
    THREE.TextureLoader,
    safe ||
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.premultiplyAlpha = true;
  return safe ? texture : null;
}

/**
 * Real catalog/Brickognize cutout as a thin double-sided 3D token.
 * Front + back images with alpha — looks like the actual part, not a fake mesh.
 */
function CutoutPart({
  front,
  back,
  colorKey,
  label,
  position,
  size = [1, 1],
  depth = 0.08,
}: {
  front?: string | null;
  back?: string | null;
  colorKey?: string | null;
  label?: string | null;
  position: [number, number, number];
  size?: [number, number];
  depth?: number;
}) {
  const frontTex = useCutoutTexture(front);
  const backTex = useCutoutTexture(back || front);
  const edge = primaryPartColor(colorKey, label, LEGO_PLASTIC);

  const materials = useMemo(() => {
    if (!frontTex) return null;
    const edgeMat = new THREE.MeshStandardMaterial({
      color: edge,
      roughness: 0.45,
      metalness: 0.03,
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      transparent: true,
      alphaTest: 0.12,
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.FrontSide,
    });
    const backMat = new THREE.MeshStandardMaterial({
      map: backTex || frontTex,
      transparent: true,
      alphaTest: 0.12,
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.FrontSide,
    });
    // box materials: +x -x +y -y +z -z
    return [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];
  }, [frontTex, backTex, edge]);

  if (!front || !materials) return null;

  return (
    <mesh position={position} castShadow material={materials}>
      <boxGeometry args={[size[0], size[1], depth]} />
    </mesh>
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
  accessory,
}: {
  helmet?: PartInfo;
  hair?: PartInfo;
  head?: PartInfo;
  shirt?: PartInfo;
  pants?: PartInfo;
  accessory?: PartInfo;
}) {
  const top = helmet || hair;
  return (
    <group position={[0, -0.35, 0]}>
      {pants?.front ? (
        <CutoutPart
          {...pants}
          position={[0, -0.7, 0]}
          size={[1.05, 1.05]}
          depth={0.1}
        />
      ) : null}
      {shirt?.front ? (
        <CutoutPart
          {...shirt}
          position={[0, 0.15, 0]}
          size={[1.15, 1.15]}
          depth={0.11}
        />
      ) : null}
      {/* Bags / accessories sit between torso and head, slightly forward */}
      {accessory?.front ? (
        <CutoutPart
          {...accessory}
          position={[0, 0.55, 0.08]}
          size={[0.95, 0.7]}
          depth={0.1}
        />
      ) : null}
      {head?.front ? (
        <CutoutPart
          {...head}
          position={[0, 0.95, 0]}
          size={[0.85, 0.85]}
          depth={0.12}
        />
      ) : null}
      {top?.front ? (
        <CutoutPart
          {...top}
          position={[0, 1.45, 0.01]}
          size={[0.95, 0.7]}
          depth={0.12}
        />
      ) : null}
    </group>
  );
}

function asPart(v: PartInfo | string | null | undefined): PartInfo {
  if (!v) return null;
  if (typeof v === "string") return { front: v, back: v };
  return v;
}

/**
 * Assembled minifig from the real scanned/catalog part images in 3D.
 */
export function Minifig3D({
  helmet,
  hair,
  head,
  shirt,
  pants,
  accessory,
  className = "",
  autoRotate = true,
}: {
  helmet?: PartInfo | string | null;
  hair?: PartInfo | string | null;
  head?: PartInfo | string | null;
  shirt?: PartInfo | string | null;
  pants?: PartInfo | string | null;
  accessory?: PartInfo | string | null;
  className?: string;
  autoRotate?: boolean;
}) {
  const parts = useMemo(
    () => ({
      helmet: asPart(helmet),
      hair: asPart(hair),
      head: asPart(head),
      shirt: asPart(shirt),
      pants: asPart(pants),
      accessory: asPart(accessory),
    }),
    [helmet, hair, head, shirt, pants, accessory]
  );

  const hasAny = Boolean(
    parts.helmet?.front ||
      parts.hair?.front ||
      parts.head?.front ||
      parts.shirt?.front ||
      parts.pants?.front ||
      parts.accessory?.front
  );

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
        camera={{ position: [1.2, 0.2, 3.5], fov: 34 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        className="h-full w-full touch-none"
      >
        <color attach="background" args={["#eef2f7"]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[3.5, 6, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />
        <Suspense fallback={null}>
          <IdleSpin enabled={autoRotate && hasAny}>
            <AssembledFig {...parts} />
          </IdleSpin>
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2.4}
          maxDistance={5.5}
          minPolarAngle={0.65}
          maxPolarAngle={Math.PI - 0.8}
          target={[0, 0.1, 0]}
        />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] font-extrabold uppercase tracking-wide text-black/40">
        Drag to rotate
      </p>
    </div>
  );
}

/**
 * Single real part cutout in 3D (front / sides / back).
 */
export function Piece3D({
  front,
  back,
  colorKey,
  label,
  className = "",
}: {
  front: string;
  back?: string | null;
  colorKey?: string | null;
  label?: string | null;
  category?: "helmet" | "hair" | "head" | "shirt" | "pants" | "accessory";
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-3 border-black bg-white ${className}`}
      role="img"
      aria-label={label || "Piece"}
    >
      <div className="checker absolute inset-3 rounded-xl opacity-25" aria-hidden />
      <Canvas
        camera={{ position: [1.0, 0.15, 2.5], fov: 40 }}
        dpr={[1, 1.75]}
        className="relative z-10 h-full w-full touch-none"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2.5, 3, 4]} intensity={1.15} />
        <Suspense fallback={null}>
          <IdleSpin enabled>
            <CutoutPart
              front={front}
              back={back}
              colorKey={colorKey}
              label={label}
              position={[0, 0, 0]}
              size={[1.45, 1.45]}
              depth={0.1}
            />
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
