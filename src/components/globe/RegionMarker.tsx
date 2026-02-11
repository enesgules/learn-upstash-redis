"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Region } from "@/lib/regions";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";
import RegionTooltip from "./RegionTooltip";

interface RegionMarkerProps {
  regions: Region[];
  lat: number;
  lon: number;
  isSelected?: boolean;
  isPrimary?: boolean;
  onClick?: (region: Region) => void;
}

const MARKER_RADIUS = 0.015;
const MARKER_ELEVATION = 0.015;

export default function RegionMarker({
  regions,
  lat,
  lon,
  isSelected = false,
  isPrimary = false,
  onClick,
}: RegionMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = latLonToVector3(
    lat,
    lon,
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
    onClick?.(regions[0]);
  }, [onClick, regions]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = Math.sin(state.clock.elapsedTime * 2 + lat) * 0.15 + 1;
    const scale = hovered ? 1.6 : isSelected || isPrimary ? 1.3 : pulse;
    meshRef.current.scale.setScalar(scale);
  });

  const color = isPrimary ? "#facc15" : "#10b981";

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {hovered && <RegionTooltip regions={regions} />}
    </group>
  );
}
