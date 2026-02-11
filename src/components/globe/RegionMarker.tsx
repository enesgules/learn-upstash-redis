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

const MARKER_RADIUS = 0.022;
const MARKER_ELEVATION = 0.02;

export default function RegionMarker({
  regions,
  lat,
  lon,
  isSelected = false,
  isPrimary = false,
  onClick,
}: RegionMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef =
    useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
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
    const scale = hovered ? 1.8 : isSelected || isPrimary ? 1.4 : pulse;
    meshRef.current.scale.setScalar(scale);

    if (glowRef.current) {
      const glowScale = hovered ? 2.8 : pulse * 1.8;
      glowRef.current.scale.setScalar(glowScale);
      glowRef.current.material.opacity = hovered ? 0.4 : 0.2;
    }
  });

  const color = isPrimary ? "#facc15" : "#f0f0f0";
  const glowColor = isPrimary ? "#facc15" : "#10b981";

  return (
    <group position={position}>
      {/* Core dot — bright white so it's visible on both day and night */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Emerald glow around the dot */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.2} />
      </mesh>

      {hovered && <RegionTooltip regions={regions} />}
    </group>
  );
}
