"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useDatabaseStore } from "@/lib/store/database-store";
import { getRegionById, type Region } from "@/lib/regions";
import { estimateLatencyStable } from "@/lib/simulation/latency";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";

/** Geographic zones — each represents a broad region of the globe */
const ZONES = [
  // North America
  { name: "US East", lat: 34, lon: -78, radius: 0.22 },
  { name: "US West", lat: 37, lon: -119, radius: 0.2 },
  { name: "Canada", lat: 54, lon: -100, radius: 0.22 },

  // South America
  { name: "Brazil", lat: -15, lon: -50, radius: 0.26 },
  { name: "S. America", lat: -33, lon: -66, radius: 0.2 },

  // Europe
  { name: "W. Europe", lat: 48, lon: 3, radius: 0.2 },
  { name: "N. Europe", lat: 60, lon: 18, radius: 0.18 },
  { name: "E. Europe", lat: 50, lon: 28, radius: 0.2 },

  // Africa
  { name: "N. Africa", lat: 28, lon: 15, radius: 0.22 },
  { name: "W. Africa", lat: 7, lon: 4, radius: 0.2 },
  { name: "E. Africa", lat: -4, lon: 35, radius: 0.2 },
  { name: "S. Africa", lat: -28, lon: 25, radius: 0.18 },

  // Middle East & Central Asia
  { name: "Middle East", lat: 28, lon: 47, radius: 0.22 },

  // South Asia
  { name: "India", lat: 22, lon: 78, radius: 0.24 },

  // East Asia
  { name: "China", lat: 35, lon: 105, radius: 0.24 },
  { name: "Japan", lat: 32, lon: 135, radius: 0.14 },

  // Southeast Asia
  { name: "SE Asia", lat: 6, lon: 108, radius: 0.22 },

  // Oceania
  { name: "Australia", lat: -27, lon: 135, radius: 0.26 },
];

const ZONE_COUNT = ZONES.length;
const ARC_SEGMENTS = 20;

function latencyColor(ms: number): string {
  if (ms <= 15) return "#10b981"; // emerald — same region
  if (ms <= 40) return "#84cc16"; // lime — nearby
  if (ms <= 80) return "#eab308"; // yellow — moderate
  if (ms <= 150) return "#f97316"; // orange — cross-continent
  return "#ef4444"; // red — opposite side of the globe
}

interface ZoneResult {
  name: string;
  lat: number;
  lon: number;
  radius: number;
  latency: number;
  color: string;
  servingRegion: Region;
}

function computeZones(activeRegionIds: string[]): ZoneResult[] {
  const regions = activeRegionIds
    .map(getRegionById)
    .filter((r): r is Region => r !== undefined);

  if (regions.length === 0) return [];

  return ZONES.map((zone) => {
    let minLatency = Infinity;
    let nearest = regions[0];
    for (const region of regions) {
      const latency = estimateLatencyStable(
        zone.lat,
        zone.lon,
        region.lat,
        region.lon
      );
      if (latency < minLatency) {
        minLatency = latency;
        nearest = region;
      }
    }

    return {
      name: zone.name,
      lat: zone.lat,
      lon: zone.lon,
      radius: zone.radius,
      latency: minLatency,
      color: latencyColor(minLatency),
      servingRegion: nearest,
    };
  });
}

function buildSurfaceArc(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): { points: THREE.Vector3[]; tipDir: THREE.Vector3 } {
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

  const tipDir = points[points.length - 1]
    .clone()
    .sub(points[points.length - 2])
    .normalize();

  return { points, tipDir };
}

// ── Instanced zone discs & rings (2 draw calls for all 18 zones) ────

function ZoneOverlays({ zones }: { zones: ZoneResult[] }) {
  const discsRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!discsRef.current || !ringsRef.current) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    zones.forEach((zone, i) => {
      const pos = latLonToVector3(zone.lat, zone.lon, GLOBE_RADIUS + 0.015);
      const normal = pos.clone().normalize();

      dummy.position.copy(pos);
      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal
      );
      dummy.scale.set(zone.radius, zone.radius, 1);
      dummy.updateMatrix();

      discsRef.current!.setMatrixAt(i, dummy.matrix);
      discsRef.current!.setColorAt(i, color.set(zone.color));

      ringsRef.current!.setMatrixAt(i, dummy.matrix);
      ringsRef.current!.setColorAt(i, color.set(zone.color));
    });

    discsRef.current.instanceMatrix.needsUpdate = true;
    if (discsRef.current.instanceColor)
      discsRef.current.instanceColor.needsUpdate = true;

    ringsRef.current.instanceMatrix.needsUpdate = true;
    if (ringsRef.current.instanceColor)
      ringsRef.current.instanceColor.needsUpdate = true;
  }, [zones]);

  return (
    <>
      <instancedMesh
        ref={discsRef}
        args={[undefined, undefined, ZONE_COUNT]}
        frustumCulled={false}
      >
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0.18}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={ringsRef}
        args={[undefined, undefined, ZONE_COUNT]}
        frustumCulled={false}
      >
        <ringGeometry args={[0.975, 1, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0.3}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}

// ── Single animated arc with arrowhead ──────────────────────────────

function ZoneArrow({
  zone,
  arc,
  progress,
}: {
  zone: ZoneResult;
  arc: { points: THREE.Vector3[]; tipDir: THREE.Vector3 };
  progress: number;
}) {
  const visibleCount = Math.max(2, Math.ceil(progress * arc.points.length));
  const visiblePoints = arc.points.slice(0, visibleCount);

  const tipPos = visiblePoints[visiblePoints.length - 1];
  const tipDir =
    visiblePoints.length >= 2
      ? tipPos
          .clone()
          .sub(visiblePoints[visiblePoints.length - 2])
          .normalize()
      : arc.tipDir;

  const quaternion = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      tipDir
    );
  }, [tipDir]);

  return (
    <group>
      <Line
        points={visiblePoints}
        color={zone.color}
        lineWidth={1}
        transparent
        opacity={0.35}
      />

      {progress > 0.85 && (
        <mesh position={tipPos} quaternion={quaternion}>
          <coneGeometry args={[0.012, 0.035, 6]} />
          <meshBasicMaterial
            color={zone.color}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

// ── Label with cheap camera-facing check (no raycasting) ────────────

function ZoneLabel({ zone }: { zone: ZoneResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const labelPos = useMemo(
    () => latLonToVector3(zone.lat, zone.lon, GLOBE_RADIUS + 0.04),
    [zone.lat, zone.lon]
  );
  const normal = useMemo(() => labelPos.clone().normalize(), [labelPos]);

  useFrame(({ camera }) => {
    if (!ref.current) return;
    // Dot product of surface normal vs camera direction — positive = facing camera
    const dot = normal.dot(camera.position.clone().normalize());
    ref.current.style.opacity = dot > 0.05 ? "1" : "0";
  });

  return (
    <Html
      position={labelPos}
      center
      distanceFactor={8}
      zIndexRange={[1, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div ref={ref} className="flex flex-col items-center transition-opacity duration-150">
        <span
          className="whitespace-nowrap rounded-full px-1.5 py-px font-mono text-[8px] font-semibold"
          style={{
            color: zone.color,
            backgroundColor: "rgba(9, 9, 11, 0.85)",
            border: `1px solid ${zone.color}33`,
          }}
        >
          {zone.latency}ms
        </span>
      </div>
    </Html>
  );
}

// ── Main component ──────────────────────────────────────────────────

export default function LatencyHeatmap() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const zones = useMemo(() => {
    if (!primaryRegion) return [];
    return computeZones([primaryRegion, ...readRegions]);
  }, [primaryRegion, readRegions]);

  const arcs = useMemo(
    () =>
      zones.map((z) =>
        buildSurfaceArc(
          z.lat,
          z.lon,
          z.servingRegion.lat,
          z.servingRegion.lon
        )
      ),
    [zones]
  );

  // ── Arc draw-in animation ──
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const prevRoutingKey = useRef("");

  // Build a key from which region serves each zone — reset animation when routing changes
  const routingKey = zones.map((z) => z.servingRegion.id).join(",");

  useEffect(() => {
    if (routingKey && routingKey !== prevRoutingKey.current) {
      progressRef.current = 0;
      prevRoutingKey.current = routingKey;
    }
  }, [routingKey]);

  useFrame((_, delta) => {
    if (progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + delta * 1.5, 1);
      setProgress(progressRef.current);
    }
  });

  if (zones.length === 0) return null;

  return (
    <group>
      {/* 2 draw calls for all discs + rings */}
      <ZoneOverlays zones={zones} />

      {/* Animated arcs + arrowheads */}
      {zones.map((zone, i) => (
        <ZoneArrow
          key={zone.name}
          zone={zone}
          arc={arcs[i]}
          progress={progress}
        />
      ))}

      {/* Labels — hidden when behind the globe */}
      {zones.map((zone) => (
        <ZoneLabel key={`label-${zone.name}`} zone={zone} />
      ))}
    </group>
  );
}
