import * as THREE from "three";

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

/**
 * Convert latitude/longitude to a Three.js Vector3 position on a sphere surface.
 * Uses standard geographic convention: lat (-90 to 90), lon (-180 to 180).
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * DEG_TO_RAD;
  const theta = (lon + 180) * DEG_TO_RAD;

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Convert a Three.js Vector3 on a sphere surface back to latitude/longitude.
 * Inverse of latLonToVector3.
 */
export function vector3ToLatLon(point: THREE.Vector3): {
  lat: number;
  lon: number;
} {
  const n = point.clone().normalize();
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, n.y))) / DEG_TO_RAD;
  const theta = Math.atan2(n.z, -n.x);
  let lon = theta / DEG_TO_RAD - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

/**
 * Calculate the great-circle distance between two lat/lon points using the Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}
