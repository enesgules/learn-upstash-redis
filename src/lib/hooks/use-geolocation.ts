"use client";

import { useState, useEffect } from "react";

interface GeoPosition {
  lat: number;
  lon: number;
}

export function useGeolocation(): GeoPosition | null {
  const [position, setPosition] = useState<GeoPosition | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        // Permission denied or unavailable — leave as null
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return position;
}
