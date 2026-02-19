"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";

const MAX_RADIUS = 2.0;

interface ReplicationWaveProps {
  lat: number;
  lon: number;
  progress: number; // 0-1
  color?: string;
}

export default function ReplicationWave({
  lat,
  lon,
  progress,
  color = "#10b981",
}: ReplicationWaveProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const position = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + 0.02),
    [lat, lon]
  );

  // Orient ring tangent to globe surface (face outward from center)
  const quaternion = useMemo(() => {
    const normal = position.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );
  }, [position]);

  useFrame(() => {
    if (!meshRef.current) return;

    // Scale the fixed-size ring instead of recreating geometry each frame
    const scale = progress * MAX_RADIUS;
    meshRef.current.scale.setScalar(scale || 0.001); // avoid zero scale
    const opacity = 0.5 * (1 - progress * 0.8);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    meshRef.current.visible = progress > 0 && progress < 1;
  });

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      {/* Normalized ring: inner≈0.87, outer=1.0 — scaled uniformly at runtime */}
      <ringGeometry args={[0.87, 1, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
