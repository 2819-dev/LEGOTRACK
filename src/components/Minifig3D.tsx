"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function usePartTexture(url: string | null | undefined) {
  const safe = url && url.length > 32 ? url : null;
  const texture = useLoader(
    THREE.TextureLoader,
    safe ||
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return safe ? texture : null;
}

function PartMesh({
  front,
  back,
  position,
  scale = [1, 1, 1],
  depth = 0.12,
}: {
  front?: string | null;
  back?: string | null;
  position: [number, number, number];
  scale?: [number, number, number];
  depth?: number;
}) {
  const frontTex = usePartTexture(front);
  const backTex = usePartTexture(back || front);
  const mats = useMemo(() => {
    if (!frontTex) return null;
    const side = new THREE.MeshStandardMaterial({
      color: "#c4c4c4",
      roughness: 0.45,
      metalness: 0.05,
    });
    return [
      side,
      side,
      side,
      side,
      new THREE.MeshStandardMaterial({
        map: frontTex,
        transparent: true,
        roughness: 0.4,
        metalness: 0.02,
      }),
      new THREE.MeshStandardMaterial({
        map: backTex || frontTex,
        transparent: true,
        roughness: 0.4,
        metalness: 0.02,
      }),
    ];
  }, [frontTex, backTex]);

  if (!front || !mats) return null;

  return (
    <mesh position={position} scale={scale} castShadow material={mats}>
      <boxGeometry args={[1, 1, depth]} />
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

/**
 * Assembled minifig in real 3D — parts snap to LEGO-like proportions and orbit.
 */
export function Minifig3D({
  helmet,
  hair,
  head,
  shirt,
  pants,
  helmetBack,
  hairBack,
  headBack,
  shirtBack,
  pantsBack,
  className = "",
  autoRotate = true,
}: {
  helmet?: string | null;
  hair?: string | null;
  head?: string | null;
  shirt?: string | null;
  pants?: string | null;
  helmetBack?: string | null;
  hairBack?: string | null;
  headBack?: string | null;
  shirtBack?: string | null;
  pantsBack?: string | null;
  className?: string;
  autoRotate?: boolean;
}) {
  const top = helmet || hair;
  const topBack = helmet ? helmetBack : hairBack;
  const hasAny = Boolean(top || head || shirt || pants);

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
        camera={{ position: [0, 0.15, 3.2], fov: 38 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        className="h-full w-full touch-none"
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1.15} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={null}>
          <IdleSpin enabled={autoRotate && hasAny}>
            <group position={[0, -0.15, 0]}>
              {/* Pants / hips */}
              <PartMesh
                front={pants}
                back={pantsBack}
                position={[0, -0.72, 0]}
                scale={[0.95, 0.95, 1]}
                depth={0.28}
              />
              {/* Torso snaps onto hips */}
              <PartMesh
                front={shirt}
                back={shirtBack}
                position={[0, 0.05, 0]}
                scale={[1, 1.05, 1]}
                depth={0.3}
              />
              {/* Head on torso neck */}
              <PartMesh
                front={head}
                back={headBack}
                position={[0, 0.92, 0]}
                scale={[0.72, 0.72, 1]}
                depth={0.34}
              />
              {/* Hair / helmet on head */}
              <PartMesh
                front={top}
                back={topBack}
                position={[0, 1.42, 0.02]}
                scale={[0.78, 0.55, 1]}
                depth={0.36}
              />
            </group>
          </IdleSpin>
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={5}
          minPolarAngle={0.6}
          maxPolarAngle={Math.PI - 0.6}
        />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] font-extrabold uppercase tracking-wide text-black/40">
        Drag to rotate
      </p>
    </div>
  );
}

/**
 * Single piece in 3D — front, sides, and back.
 */
export function Piece3D({
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
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-3 border-black bg-white ${className}`}
      role="img"
      aria-label={label || "Rotate piece"}
    >
      <div className="checker absolute inset-3 rounded-xl opacity-30" aria-hidden />
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 40 }}
        dpr={[1, 1.75]}
        className="relative z-10 h-full w-full touch-none"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2.5, 3, 4]} intensity={1.1} />
        <Suspense fallback={null}>
          <IdleSpin enabled>
            <PartMesh
              front={front}
              back={back}
              position={[0, 0, 0]}
              scale={[1.35, 1.35, 1]}
              depth={0.22}
            />
          </IdleSpin>
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.6} maxDistance={4} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 text-center text-[10px] font-extrabold uppercase tracking-wide text-black/40">
        Drag to rotate
      </p>
    </div>
  );
}
