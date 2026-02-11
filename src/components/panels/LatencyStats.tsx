"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { calculateGlobalCoverage, estimateLatencyStable } from "@/lib/simulation/latency";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { getRegionById, regions, type Region } from "@/lib/regions";
import { calculateDistance } from "@/lib/geo-utils";

function findNearestRegion(
  lat: number,
  lon: number,
  pool: Region[]
): Region | null {
  if (pool.length === 0) return null;
  let nearest = pool[0];
  let minDist = Infinity;
  for (const r of pool) {
    const d = calculateDistance(lat, lon, r.lat, r.lon);
    if (d < minDist) {
      minDist = d;
      nearest = r;
    }
  }
  return nearest;
}

export default function LatencyStats() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const userLocation = useGeolocation();

  const globalReadLatency = useMemo(() => {
    if (!primaryRegion) return null;
    return calculateGlobalCoverage(primaryRegion, readRegions);
  }, [primaryRegion, readRegions]);

  // Also compute with just primary for comparison
  const primaryOnlyLatency = useMemo(() => {
    if (!primaryRegion) return null;
    return calculateGlobalCoverage(primaryRegion, []);
  }, [primaryRegion]);

  // User's personal latency to nearest active region
  const userLatency = useMemo(() => {
    if (!userLocation || !primaryRegion) return null;
    const activeRegions = [primaryRegion, ...readRegions]
      .map(getRegionById)
      .filter((r): r is Region => r !== undefined);
    const nearest = findNearestRegion(
      userLocation.lat,
      userLocation.lon,
      activeRegions
    );
    if (!nearest) return null;
    return {
      ms: estimateLatencyStable(
        userLocation.lat,
        userLocation.lon,
        nearest.lat,
        nearest.lon
      ),
      city: nearest.city,
    };
  }, [userLocation, primaryRegion, readRegions]);

  if (!primaryRegion) return null;

  const improvement =
    primaryOnlyLatency && globalReadLatency && readRegions.length > 0
      ? Math.round(((primaryOnlyLatency - globalReadLatency) / primaryOnlyLatency) * 100)
      : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-zinc-800/50 bg-zinc-950/90 px-5 py-4 backdrop-blur-md"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Global Read Latency
        </p>

        <div className="mt-3">
          {/* Big number: global read avg */}
          <div className="flex items-baseline gap-2">
            <motion.span
              key={globalReadLatency}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-2xl font-bold text-emerald-400"
            >
              {globalReadLatency}ms
            </motion.span>
            {improvement !== null && improvement > 0 && (
              <motion.span
                key={improvement}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-xs text-emerald-500/70"
              >
                -{improvement}%
              </motion.span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500">
            avg. read latency worldwide
          </span>
        </div>

        {/* Replica count */}
        <div className="mt-3 flex gap-2">
          <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            1 primary
          </span>
          {readRegions.length > 0 && (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              {readRegions.length} replica{readRegions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* User's personal latency */}
        {userLatency && (
          <div className="mt-3 border-t border-zinc-800/50 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-zinc-500">Your latency</span>
              <div className="flex items-baseline gap-1.5">
                <motion.span
                  key={userLatency.ms}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-sm font-semibold text-sky-400"
                >
                  {userLatency.ms}ms
                </motion.span>
                <span className="text-[10px] text-zinc-600">
                  to {userLatency.city}
                </span>
              </div>
            </div>
          </div>
        )}

        {readRegions.length === 0 && (
          <p className="mt-2 text-[10px] text-zinc-600">
            Add replicas to reduce global latency
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
