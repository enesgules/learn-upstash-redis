"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3, calculateDistance } from "@/lib/geo-utils";
import { estimateLatencyStable } from "@/lib/simulation/latency";
import { useDatabaseStore } from "@/lib/store/database-store";
import { regions, getRegionById, type Region } from "@/lib/regions";
import { GLOBE_RADIUS } from "./Globe";

const MARKER_ELEVATION = 0.02;
const SKY_COLOR = "#38bdf8";
const ARC_SEGMENTS = 48;
const RING_COUNT = 3;

interface UserLocationMarkerProps {
  lat: number;
  lon: number;
}

function findNearestRegion(
  lat: number,
  lon: number,
  regionPool: Region[]
): Region | null {
  if (regionPool.length === 0) return null;

  let nearest = regionPool[0];
  let minDist = Infinity;

  for (const region of regionPool) {
    const dist = calculateDistance(lat, lon, region.lat, region.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = region;
    }
  }

  return nearest;
}

function buildArc(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): THREE.Vector3[] {
  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);
  const elevation = GLOBE_RADIUS + 0.025;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const point = start
      .clone()
      .lerp(end, t)
      .normalize()
      .multiplyScalar(elevation);
    points.push(point);
  }
  return points;
}

/** A single expanding ring that fades out as it grows */
function PulseRing({
  index,
  normal,
}: {
  index: number;
  normal: THREE.Vector3;
}) {
  const ref = useRef<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>(null);

  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal
      ),
    [normal]
  );

  useFrame((state) => {
    if (!ref.current) return;
    // Stagger each ring by phase offset
    const phase = (state.clock.elapsedTime * 0.8 + index * (1 / RING_COUNT)) % 1;
    const scale = 0.02 + phase * 0.12;
    ref.current.scale.setScalar(scale);
    ref.current.material.opacity = (1 - phase) * 0.4;
  });

  return (
    <mesh ref={ref} quaternion={quaternion}>
      <ringGeometry args={[0.85, 1, 32]} />
      <meshBasicMaterial
        color={SKY_COLOR}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function UserLocationMarker({
  lat,
  lon,
}: UserLocationMarkerProps) {
  const dotRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const hasDatabase = !!primaryRegion;

  const activeRegions = useMemo(() => {
    if (!primaryRegion) return [];
    return [primaryRegion, ...readRegions]
      .map(getRegionById)
      .filter((r): r is Region => r !== undefined);
  }, [primaryRegion, readRegions]);

  const position = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + MARKER_ELEVATION),
    [lat, lon]
  );

  const normal = useMemo(() => position.clone().normalize(), [position]);

  const nearest = useMemo(
    () => findNearestRegion(lat, lon, hasDatabase ? activeRegions : regions),
    [lat, lon, hasDatabase, activeRegions]
  );

  const latency = useMemo(() => {
    if (!nearest) return null;
    return estimateLatencyStable(lat, lon, nearest.lat, nearest.lon);
  }, [lat, lon, nearest]);

  const arcPoints = useMemo(() => {
    if (!nearest) return null;
    return buildArc(lat, lon, nearest.lat, nearest.lon);
  }, [lat, lon, nearest]);

  const labelPos = useMemo(
    () => latLonToVector3(lat, lon, GLOBE_RADIUS + 0.07),
    [lat, lon]
  );

  const badgeRef = useRef<HTMLDivElement>(null);

  useFrame((state) => {
    if (dotRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      dotRef.current.scale.setScalar(pulse);
    }
    // Hide badge when behind the globe
    if (badgeRef.current) {
      const dot = normal.dot(state.camera.position.clone().normalize());
      badgeRef.current.style.opacity = dot > 0.05 ? "1" : "0";
    }
  });

  return (
    <group>
      {/* Center dot — small bright cyan */}
      <mesh
        ref={dotRef}
        position={position}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={SKY_COLOR} />
      </mesh>

      {/* Expanding radar-ping rings */}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <group key={i} position={position}>
          <PulseRing index={i} normal={normal} />
        </group>
      ))}

      {/* Arc to nearest active region (only when database configured) */}
      {arcPoints && (
        <Line
          points={arcPoints}
          color={SKY_COLOR}
          lineWidth={1.5}
          transparent
          opacity={0.35}
        />
      )}

      {/* Persistent latency badge — only when a database is configured */}
      {hasDatabase && nearest && latency !== null && (
        <Html
          position={labelPos}
          center
          distanceFactor={8}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div ref={badgeRef} className="flex flex-col items-center transition-opacity duration-150">
            <span
              className="whitespace-nowrap rounded-full px-1.5 py-px font-mono text-[8px] font-semibold"
              style={{
                color: SKY_COLOR,
                backgroundColor: "rgba(9, 9, 11, 0.85)",
                border: `1px solid rgba(56, 189, 248, 0.2)`,
              }}
            >
              {latency}ms
            </span>
          </div>
        </Html>
      )}

      {/* Tooltip — only on hover */}
      {hovered && (
        <Html
          position={labelPos}
          center
          distanceFactor={5}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none", transform: "translateY(-24px)" }}
        >
          <div className="whitespace-nowrap rounded-lg border border-sky-500/30 bg-zinc-950/95 px-3 py-2 shadow-[0_0_12px_rgba(56,189,248,0.15)] backdrop-blur-md">
            <span className="text-[13px] font-semibold text-sky-400">
              You are here
            </span>
            {nearest && latency !== null && (
              <div className="mt-1 text-[10px] font-mono text-zinc-400">
                {latency}ms to {nearest.city}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
