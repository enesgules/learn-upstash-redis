"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";

interface LatencyLabelProps {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  latencyMs: number;
}

export default function LatencyLabel({
  startLat,
  startLon,
  endLat,
  endLon,
  latencyMs,
}: LatencyLabelProps) {
  const position = useMemo(() => {
    const surfaceOffset = GLOBE_RADIUS + 0.03;
    const start = latLonToVector3(startLat, startLon, surfaceOffset);
    const end = latLonToVector3(endLat, endLon, surfaceOffset);

    const mid = start.clone().add(end).multiplyScalar(0.5);
    const angularDistance = start.angleTo(end);
    const arcHeight = 0.3 + (angularDistance / Math.PI) * 1.0;
    mid.normalize().multiplyScalar(GLOBE_RADIUS + arcHeight);

    // Place label at the peak of the arc (midpoint)
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoint(0.5);
  }, [startLat, startLon, endLat, endLon]);

  return (
    <Html
      position={position}
      center
      distanceFactor={6}
      occlude
      zIndexRange={[1, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span className="whitespace-nowrap rounded-full border border-zinc-700/50 bg-zinc-900/90 px-2 py-0.5 font-mono text-[10px] text-emerald-400 backdrop-blur-sm">
        {latencyMs}ms
      </span>
    </Html>
  );
}
