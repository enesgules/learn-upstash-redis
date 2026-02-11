"use client";

import { useDatabaseStore } from "@/lib/store/database-store";
import { getRegionById } from "@/lib/regions";
import ConnectionArc from "./ConnectionArc";

export default function ConnectionArcs() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  if (!primaryRegion) return null;
  const primary = getRegionById(primaryRegion);
  if (!primary) return null;

  return (
    <group>
      {readRegions.map((readId) => {
        const readRegion = getRegionById(readId);
        if (!readRegion) return null;

        return (
          <ConnectionArc
            key={readId}
            startLat={primary.lat}
            startLon={primary.lon}
            endLat={readRegion.lat}
            endLon={readRegion.lon}
          />
        );
      })}
    </group>
  );
}
