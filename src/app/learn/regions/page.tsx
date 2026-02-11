"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import LatencyHeatmap from "@/components/globe/LatencyHeatmap";
import RegionBuilder from "@/components/panels/RegionBuilder";
import LatencyStats from "@/components/panels/LatencyStats";
import LearningPathNav from "@/components/ui/LearningPathNav";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useDatabaseStore } from "@/lib/store/database-store";
import type { Region } from "@/lib/regions";
import { playSelectSound, playDeselectSound, playConnectionSound } from "@/lib/sounds";

export default function RegionsPage() {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const isLoaded = minTimeElapsed && globeReady;

  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const toggleRegion = useDatabaseStore((s) => s.toggleRegion);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 500);
    return () => clearTimeout(t);
  }, []);

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  const handleRegionClick = useCallback(
    (region: Region) => {
      if (region.id === primaryRegion || readRegions.includes(region.id)) {
        playDeselectSound();
      } else if (!primaryRegion) {
        playSelectSound();
      } else {
        playConnectionSound();
      }
      toggleRegion(region.id);
    },
    [toggleRegion, primaryRegion, readRegions]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Full-screen globe */}
      <div className="absolute inset-0">
        <GlobeScene
          onReady={handleGlobeReady}
          onRegionClick={handleRegionClick}
          selectedRegions={readRegions}
          primaryRegion={primaryRegion}
          showUserDbConnection
        >
          <LatencyHeatmap />
          <ConnectionArcs />
        </GlobeScene>
      </div>

      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Left panel: Region Builder */}
      <div className="absolute inset-y-0 left-0 z-20 w-[380px] p-4">
        <RegionBuilder />
      </div>

      {/* Top-right: Latency Stats */}
      <div className="absolute top-14 right-4 z-20">
        <LatencyStats />
      </div>

      {/* Bottom: Learning Path Nav (offset past the left panel) */}
      <div className="absolute right-0 bottom-0 left-[380px] z-20 flex flex-col items-center gap-3 pb-6">
        <LearningPathNav activeStep={1} />
        <p className="text-xs text-zinc-600">
          Click regions on the globe or panel to build your database
        </p>
      </div>

      {/* Loading screen */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>
    </div>
  );
}
