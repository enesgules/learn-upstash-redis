"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import FailoverVisualization from "@/components/globe/FailoverVisualization";
import FailoverPanel from "@/components/panels/FailoverPanel";
import FailoverTimeline from "@/components/panels/FailoverTimeline";
import LearningPathNav from "@/components/ui/LearningPathNav";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { getRegionById } from "@/lib/regions";

export default function FailoverPage() {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const isLoaded = minTimeElapsed && globeReady;

  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const phase = useFailoverStore((s) => s.phase);
  const newPrimaryId = useFailoverStore((s) => s.newPrimaryId);

  // Default region setup with extra replicas for meaningful failover
  useEffect(() => {
    const { primaryRegion, setPrimary, addReadRegion } =
      useDatabaseStore.getState();
    if (!primaryRegion) {
      setPrimary("us-east-1");
      addReadRegion("eu-west-1");
      addReadRegion("ap-southeast-1");
      addReadRegion("ap-northeast-1");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 500);
    return () => clearTimeout(t);
  }, []);

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  // Compute effective primary for RegionMarker coloring
  const effectivePrimary =
    phase === "idle"
      ? primaryRegion
      : phase === "elected" || phase === "recovering" || phase === "complete"
        ? newPrimaryId
        : null;

  // Camera target: focus on primary initially, pan to new primary after election
  // Release camera when complete so the user can freely orbit
  const cameraTarget = useMemo(() => {
    if (phase === "complete") return null;
    if (phase === "electing" || phase === "elected" || phase === "recovering") {
      if (newPrimaryId) {
        const r = getRegionById(newPrimaryId);
        if (r) return { lat: r.lat, lon: r.lon };
      }
    }
    // Default: focus on primary (idle, failure, detecting)
    if (primaryRegion) {
      const r = getRegionById(primaryRegion);
      if (r) return { lat: r.lat, lon: r.lon };
    }
    return null;
  }, [phase, primaryRegion, newPrimaryId]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Full-screen globe */}
      <div className="absolute inset-0">
        <GlobeScene
          onReady={handleGlobeReady}
          selectedRegions={readRegions}
          primaryRegion={effectivePrimary}
          cameraTarget={cameraTarget}
        >
          {/* Normal arcs only in idle */}
          {phase === "idle" && <ConnectionArcs />}
          <FailoverVisualization />
        </GlobeScene>
      </div>

      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

      {/* Left panel: Failover controls */}
      <div className="absolute inset-y-0 left-0 z-20 w-[380px] p-4">
        <FailoverPanel />
      </div>

      {/* Top-right: Failover Timeline */}
      <div className="absolute top-14 right-4 z-20 w-[320px]">
        <FailoverTimeline />
      </div>

      {/* Bottom: Learning Path Nav */}
      <div className="absolute right-0 bottom-0 left-[380px] z-20 flex flex-col items-center gap-3 pb-6">
        <LearningPathNav activeStep={5} />
        <p className="text-xs text-zinc-600">
          Kill the primary to see automatic failover in action
        </p>
      </div>

      {/* Loading screen */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>
    </div>
  );
}
