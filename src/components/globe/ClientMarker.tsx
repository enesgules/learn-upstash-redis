"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";

interface ClientMarkerProps {
  lat: number;
  lon: number;
}

export default function ClientMarker({ lat, lon }: ClientMarkerProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const position = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + 0.03),
    [lat, lon]
  );

  const normal = useMemo(() => position.clone().normalize(), [position]);

  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal
      ),
    [normal]
  );

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();

    // Pulsing glow
    if (glowRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.15;
      glowRef.current.scale.setScalar(pulse);
    }

    // Expanding ring
    if (ringRef.current) {
      const cycle = (t * 0.8) % 1;
      const scale = 1 + cycle * 3;
      ringRef.current.scale.set(scale, scale, 1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.4 * (1 - cycle);
    }

    // Hide label behind globe
    if (labelRef.current) {
      const dot = normal.dot(camera.position.clone().normalize());
      labelRef.current.style.opacity = dot > 0.05 ? "1" : "0";
    }
  });

  return (
    <group>
      {/* Core sphere */}
      <mesh position={position}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Expanding ring */}
      <mesh ref={ringRef} position={position} quaternion={quaternion}>
        <ringGeometry args={[0.03, 0.035, 32]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      <Html
        position={position}
        center
        distanceFactor={8}
        zIndexRange={[1, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={labelRef}
          className="flex flex-col items-center translate-y-4 transition-opacity duration-150"
        >
          <span className="whitespace-nowrap rounded-full bg-cyan-500/10 px-1.5 py-px font-mono text-[8px] font-semibold text-cyan-400 border border-cyan-500/20">
            Client
          </span>
        </div>
      </Html>
    </group>
  );
}
