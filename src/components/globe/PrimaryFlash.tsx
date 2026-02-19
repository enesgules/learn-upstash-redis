"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";

interface PrimaryFlashProps {
  lat: number;
  lon: number;
  active: boolean;
  color?: string;
}

export default function PrimaryFlash({ lat, lon, active, color = "#10b981" }: PrimaryFlashProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const wasActive = useRef(false);

  const position = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + 0.03),
    [lat, lon]
  );

  // Reset progress when active triggers
  useEffect(() => {
    if (active && !wasActive.current) {
      progressRef.current = 0;
    }
    wasActive.current = active;
  }, [active]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (active || progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + delta / 0.4, 1);
    }

    const t = progressRef.current;
    const scale = t * 0.3;
    const opacity = 0.6 * (1 - t);

    meshRef.current.scale.setScalar(scale);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    meshRef.current.visible = t < 1;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
