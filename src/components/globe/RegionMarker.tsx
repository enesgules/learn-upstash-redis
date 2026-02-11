"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Region } from "@/lib/regions";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";
import RegionTooltip from "./RegionTooltip";

interface RegionMarkerProps {
  region: Region;
  isSelected?: boolean;
  isPrimary?: boolean;
  onClick?: (region: Region) => void;
}

const MARKER_RADIUS = 0.025;
const MARKER_ELEVATION = 0.02;

export default function RegionMarker({
  region,
  isSelected = false,
  isPrimary = false,
  onClick,
}: RegionMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = latLonToVector3(
    region.lat,
    region.lon,
    GLOBE_RADIUS + MARKER_ELEVATION
  );

  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const handleClick = useCallback(() => {
    onClick?.(region);
  }, [onClick, region]);

  // Pulsing animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const pulse = Math.sin(state.clock.elapsedTime * 2 + region.lat) * 0.3 + 1;
    const scale = hovered ? 1.8 : isSelected || isPrimary ? 1.4 : pulse;
    meshRef.current.scale.setScalar(scale);

    if (glowRef.current) {
      const glowScale = hovered ? 3 : isSelected || isPrimary ? 2.5 : pulse * 1.5;
      glowRef.current.scale.setScalar(glowScale);
    }
  });

  const color = isPrimary ? "#facc15" : "#10b981";

  return (
    <group position={position}>
      {/* Core dot */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {/* Tooltip on hover */}
      {hovered && <RegionTooltip region={region} />}
    </group>
  );
}
