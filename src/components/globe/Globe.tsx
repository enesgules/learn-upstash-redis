"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GLOBE_RADIUS = 2;

export { GLOBE_RADIUS };

export default function Globe() {
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <group>
      {/* Solid dark sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Wireframe overlay for grid lines */}
      <mesh ref={wireframeRef}>
        <sphereGeometry args={[GLOBE_RADIUS + 0.005, 32, 32]} />
        <meshBasicMaterial
          color="#10b981"
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>

      {/* Atmosphere glow ring */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.04, 64, 64]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
