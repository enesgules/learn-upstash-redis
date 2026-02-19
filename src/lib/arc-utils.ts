import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo-utils";
import { buildGreatCircleArc } from "@/components/globe/ConnectionArc";
import { GLOBE_RADIUS } from "@/components/globe/Globe";

/**
 * Compute arc points between two lat/lon positions with automatic peak height
 * based on angular distance. Shared across all visualization components.
 */
export function computeArcPoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): THREE.Vector3[] {
  const start = latLonToVector3(startLat, startLon, GLOBE_RADIUS);
  const end = latLonToVector3(endLat, endLon, GLOBE_RADIUS);
  const angularDistance = start.angleTo(end);
  const peakHeight = 0.15 + (angularDistance / Math.PI) * 0.6;
  return buildGreatCircleArc(startLat, startLon, endLat, endLon, 64, peakHeight);
}
