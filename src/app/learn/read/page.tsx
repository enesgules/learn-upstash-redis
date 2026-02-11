"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import LatencyHeatmap from "@/components/globe/LatencyHeatmap";
import ReadFlowVisualization from "@/components/globe/ReadFlowVisualization";
import ReadPanel from "@/components/panels/ReadPanel";
import LatencyComparison from "@/components/panels/LatencyComparison";
import LearningPathNav from "@/components/ui/LearningPathNav";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import type { Region } from "@/lib/regions";
import { playSelectSound } from "@/lib/sounds";

export default function ReadPage() {
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
    playSelectSound();
    useReadFlowStore.getState().setClientLocation(lat, lon);
  }, []);

  // Clicking a region marker also sets client location there
  const handleRegionClick = useCallback((region: Region) => {
    playSelectSound();
    useReadFlowStore.getState().setClientLocation(region.lat, region.lon);
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
          showUserDbConnection
        >
          <ConnectionArcs />
          <LatencyHeatmap />
          <ReadFlowVisualization />
        </GlobeScene>
      </div>

      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Left panel: Read Panel */}
      <div className="absolute inset-y-0 left-0 z-20 w-[380px] p-4">
        <ReadPanel />
      </div>

      {/* Top-right: Latency Comparison */}
      <div className="absolute top-14 right-4 z-20 w-[320px]">
        <LatencyComparison />
      </div>

      {/* Bottom: Learning Path Nav */}
      <div className="absolute right-0 bottom-0 left-[380px] z-20 flex flex-col items-center gap-3 pb-6">
        <LearningPathNav activeStep={3} />
        <p className="text-xs text-zinc-600">
          Click the globe to place your client, then execute a read
        </p>
      </div>

      {/* Loading screen */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>
    </div>
  );
}
