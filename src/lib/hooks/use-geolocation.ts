"use client";

import { useSyncExternalStore, useCallback } from "react";

interface GeoPosition {
  lat: number;
  lon: number;
}

let cachedPosition: GeoPosition | null = null;
let requested = false;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Trigger geolocation request on first subscribe (client-only)
  if (!requested) {
    requested = true;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedPosition = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          listeners.forEach((fn) => fn());
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): GeoPosition | null {
  return cachedPosition;
}

function getServerSnapshot(): GeoPosition | null {
  return null;
}

export function useGeolocation(): GeoPosition | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
