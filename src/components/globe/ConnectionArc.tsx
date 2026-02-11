"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { GLOBE_RADIUS } from "./Globe";

const ARC_SEGMENTS = 64;

/**
 * Build an array of points along a great-circle arc between two lat/lon
 * positions, elevated above the globe surface with a smooth parabolic peak.
 */
function buildGreatCircleArc(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  segments: number,
  peakHeight: number
): THREE.Vector3[] {
  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Spherical interpolation along the great circle
    const point = start.clone().lerp(end, t).normalize();

    // Parabolic elevation: peaks at t=0.5
    const elevation = peakHeight * 4 * t * (1 - t);

    point.multiplyScalar(GLOBE_RADIUS + 0.03 + elevation);
    points.push(point);
  }

  return points;
}

interface ConnectionArcProps {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  color?: string;
}

export default function ConnectionArc({
  startLat,
  startLon,
  endLat,
  endLon,
  color = "#10b981",
}: ConnectionArcProps) {
  const [progress, setProgress] = useState(0);

  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);
  const angularDistance = start.angleTo(end);
  const peakHeight = 0.15 + (angularDistance / Math.PI) * 0.6;

  const allPoints = buildGreatCircleArc(
    startLat,
    startLon,
    endLat,
    endLon,
    ARC_SEGMENTS,
    peakHeight
  );

  // Animate draw-in over 0.8s
  useFrame((_, delta) => {
    if (progress < 1) {
      setProgress((p) => Math.min(p + delta / 0.8, 1));
    }
  });

  const visibleCount = Math.max(2, Math.ceil(progress * allPoints.length));
  const visiblePoints = allPoints.slice(0, visibleCount);

  return (
    <Line
      points={visiblePoints}
      color={color}
      lineWidth={1.5}
      transparent
      opacity={0.6 + progress * 0.2}
    />
  );
}
