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
}

export default function ReplicationWave({
  lat,
  lon,
  progress,
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

    const innerRadius = progress * MAX_RADIUS;
    const outerRadius = innerRadius * 1.15 + 0.01; // small minimum thickness
    const opacity = 0.5 * (1 - progress * 0.8);

    // Update geometry by replacing it
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      64
    );

    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    meshRef.current.visible = progress > 0 && progress < 1;
  });

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      <ringGeometry args={[0, 0.01, 64]} />
      <meshBasicMaterial
        color="#10b981"
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
