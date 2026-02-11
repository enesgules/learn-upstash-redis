"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import ConsistencyRaceVisualization from "@/components/globe/ConsistencyRaceVisualization";
import ConsistencyRacePanel from "@/components/panels/ConsistencyRacePanel";
import LearningPathNav from "@/components/ui/LearningPathNav";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { getRegionById, type Region } from "@/lib/regions";
import { estimateLatencyStable } from "@/lib/simulation/latency";

export default function ConsistencyPage() {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const isLoaded = minTimeElapsed && globeReady;

  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const clientLocation = useConsistencyRaceStore((s) => s.clientLocation);
  const geo = useGeolocation();

  // Default region setup if none configured (direct navigation)
  useEffect(() => {
    const { primaryRegion, setPrimary, addReadRegion } =
      useDatabaseStore.getState();
    if (!primaryRegion) {
      setPrimary("us-east-1");
      addReadRegion("eu-west-1");
      addReadRegion("ap-southeast-1");
    }
  }, []);

  // Auto-set client location from browser geolocation
  useEffect(() => {
    if (!geo) return;
    const store = useConsistencyRaceStore.getState();
    if (!store.clientLocation) {
      store.setClientLocation(geo.lat, geo.lon);
    }
  }, [geo]);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Find nearest region to client (primary or any replica)
  const allRegionIds = useMemo(
    () => (primaryRegion ? [primaryRegion, ...readRegions] : []),
    [primaryRegion, readRegions]
  );

  const nearest = useMemo(() => {
    if (!clientLocation || allRegionIds.length === 0) return null;
    let best: { id: string; latency: number } | null = null;
    for (const id of allRegionIds) {
      const region = getRegionById(id);
      if (!region) continue;
      const latency = estimateLatencyStable(
        clientLocation.lat,
        clientLocation.lon,
        region.lat,
        region.lon
      );
      if (!best || latency < best.latency) {
        best = { id, latency };
      }
    }
    return best;
  }, [clientLocation, allRegionIds]);

  const nearestIsPrimary = nearest?.id === primaryRegion;
  const replicaRegionId = nearest && !nearestIsPrimary ? nearest.id : null;

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  const handleGlobeClick = useCallback((lat: number, lon: number) => {
    useConsistencyRaceStore.getState().setClientLocation(lat, lon);
  }, []);

  const handleRegionClick = useCallback((region: Region) => {
    useConsistencyRaceStore
      .getState()
      .setClientLocation(region.lat, region.lon);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Full-screen globe */}
      <div className="absolute inset-0">
        <GlobeScene
          onReady={handleGlobeReady}
          onRegionClick={handleRegionClick}
          onGlobeClick={handleGlobeClick}
          selectedRegions={readRegions}
          primaryRegion={primaryRegion}
        >
          <ConnectionArcs />
          {replicaRegionId && (
            <ConsistencyRaceVisualization
              replicaRegionId={replicaRegionId}
            />
          )}
        </GlobeScene>
      </div>

      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Left panel */}
      <div className="absolute inset-y-0 left-0 z-20 w-[380px] p-4">
        <ConsistencyRacePanel
          replicaRegionId={replicaRegionId}
          nearestIsPrimary={nearestIsPrimary}
        />
      </div>

      {/* Bottom: Learning Path Nav */}
      <div className="absolute right-0 bottom-0 left-[380px] z-20 flex flex-col items-center gap-3 pb-6">
        <LearningPathNav activeStep={4} />
        <p className="text-xs text-zinc-600">
          Adjust the delay slider, then run the race to see eventual consistency
        </p>
      </div>

      {/* Loading screen */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>
    </div>
  );
}
