"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import WriteFlowVisualization from "@/components/globe/WriteFlowVisualization";
import WritePanel from "@/components/panels/WritePanel";
import EventTimeline from "@/components/panels/EventTimeline";
import LearningPathNav from "@/components/ui/LearningPathNav";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import type { Region } from "@/lib/regions";

export default function WritePage() {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const isLoaded = minTimeElapsed && globeReady;

  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  // Default region setup if none configured
  useEffect(() => {
    const { primaryRegion, setPrimary, addReadRegion } =
      useDatabaseStore.getState();
    if (!primaryRegion) {
      setPrimary("us-east-1");
      addReadRegion("eu-west-1");
      addReadRegion("ap-southeast-1");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 500);
    return () => clearTimeout(t);
  }, []);

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  // Clicking globe surface sets client location
  const handleGlobeClick = useCallback((lat: number, lon: number) => {
    useWriteFlowStore.getState().setClientLocation(lat, lon);
  }, []);

  // Clicking a region marker also sets client location there
  const handleRegionClick = useCallback((region: Region) => {
    useWriteFlowStore.getState().setClientLocation(region.lat, region.lon);
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
          <WriteFlowVisualization />
        </GlobeScene>
      </div>

      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Left panel: Write Panel */}
      <div className="absolute inset-y-0 left-0 z-20 w-[380px] p-4">
        <WritePanel />
      </div>

      {/* Top-right: Event Timeline */}
      <div className="absolute top-4 right-4 z-20 w-[320px]">
        <EventTimeline />
      </div>

      {/* Bottom: Learning Path Nav */}
      <div className="absolute right-0 bottom-0 left-[380px] z-20 flex flex-col items-center gap-3 pb-6">
        <LearningPathNav activeStep={2} />
        <p className="text-xs text-zinc-600">
          Click the globe to place your client, then execute a write
        </p>
      </div>

      {/* Loading screen */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>
    </div>
  );
}
