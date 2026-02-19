"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import LatencyHeatmap from "@/components/globe/LatencyHeatmap";
import WriteFlowVisualization from "@/components/globe/WriteFlowVisualization";
import ReadFlowVisualization from "@/components/globe/ReadFlowVisualization";
import ConsistencyRaceVisualization from "@/components/globe/ConsistencyRaceVisualization";
import FailoverVisualization from "@/components/globe/FailoverVisualization";
import RegionBuilder from "@/components/panels/RegionBuilder";
import LatencyStats from "@/components/panels/LatencyStats";
import WritePanel from "@/components/panels/WritePanel";
import EventTimeline from "@/components/panels/EventTimeline";
import ReadPanel from "@/components/panels/ReadPanel";
import LatencyComparison from "@/components/panels/LatencyComparison";
import ConsistencyRacePanel from "@/components/panels/ConsistencyRacePanel";
import FailoverPanel from "@/components/panels/FailoverPanel";
import FailoverTimeline from "@/components/panels/FailoverTimeline";
import LearningPathNav from "@/components/ui/LearningPathNav";
import NextStepButton from "@/components/ui/NextStepButton";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { getRegionById, type Region } from "@/lib/regions";
import { estimateLatencyStable } from "@/lib/simulation/latency";
import {
  playSelectSound,
  playDeselectSound,
  playConnectionSound,
} from "@/lib/sounds";

// ── Hint text per step ───────────────────────────────────────────────
const HINTS: Record<number, string> = {
  0: "Drag to rotate \u00b7 Scroll to zoom \u00b7 Hover regions to explore",
  1: "Click regions on the globe or panel to build your database",
  2: "Click the globe to place your client, then execute a write",
  3: "Click the globe to place your client, then execute a read",
  4: "Adjust the delay slider, then run the race to see eventual consistency",
  5: "Kill the primary to see automatic failover in action",
};

// ── Panel animation variants ─────────────────────────────────────────
const leftPanelVariants = {
  hidden: { x: -400, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: -400, opacity: 0 },
};

const rightPanelVariants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
};

const panelTransition = { type: "spring" as const, damping: 25, stiffness: 200 };

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const isLoaded = minTimeElapsed && globeReady;
  const isLanding = activeStep === 0;

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 800);
    return () => clearTimeout(t);
  }, []);

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
  }, []);

  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);

  // Hide title 5s after globe is loaded and welcome overlay is gone
  useEffect(() => {
    if (!isLoaded) return;
    if (!hasSeenWelcome) return;
    const t = setTimeout(() => setShowTitle(false), 5000);
    return () => clearTimeout(t);
  }, [isLoaded, hasSeenWelcome]);

  // ── Shared store state ──────────────────────────────────────────────
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const toggleRegion = useDatabaseStore((s) => s.toggleRegion);
  const geo = useGeolocation();

  // ── Step-specific setup ─────────────────────────────────────────────

  // Steps 2-5: ensure default regions exist
  useEffect(() => {
    if (activeStep < 2) return;
    const { primaryRegion, setPrimary, addReadRegion } =
      useDatabaseStore.getState();
    if (!primaryRegion) {
      setPrimary("us-east-1");
      addReadRegion("eu-west-1");
      addReadRegion("ap-southeast-1");
      if (activeStep === 5) addReadRegion("ap-northeast-1");
    }
  }, [activeStep]);

  // Write step: auto-place client from geolocation
  useEffect(() => {
    if (activeStep !== 2) return;
    if (geo && !useWriteFlowStore.getState().clientLocation) {
      useWriteFlowStore.getState().setClientLocation(geo.lat, geo.lon);
    }
  }, [activeStep, geo]);

  // Consistency step: auto-place client from geolocation
  useEffect(() => {
    if (activeStep !== 4) return;
    if (geo && !useConsistencyRaceStore.getState().clientLocation) {
      useConsistencyRaceStore.getState().setClientLocation(geo.lat, geo.lon);
    }
  }, [activeStep, geo]);

  // ── Region click handler (step-dependent) ───────────────────────────
  const handleRegionClick = useCallback(
    (region: Region) => {
      if (activeStep === 0) {
        // Landing: click a region → enter Regions step with it as primary
        playSelectSound();
        toggleRegion(region.id);
        setActiveStep(1);
        return;
      }
      if (activeStep === 1) {
        if (
          region.id === primaryRegion ||
          readRegions.includes(region.id)
        ) {
          playDeselectSound();
        } else if (!primaryRegion) {
          playSelectSound();
        } else {
          playConnectionSound();
        }
        toggleRegion(region.id);
      } else if (activeStep === 2) {
        playSelectSound();
        useWriteFlowStore
          .getState()
          .setClientLocation(region.lat, region.lon);
      } else if (activeStep === 3) {
        playSelectSound();
        useReadFlowStore
          .getState()
          .setClientLocation(region.lat, region.lon);
      } else if (activeStep === 4) {
        playSelectSound();
        useConsistencyRaceStore
          .getState()
          .setClientLocation(region.lat, region.lon);
      }
    },
    [activeStep, primaryRegion, readRegions, toggleRegion]
  );

  // ── Globe click handler (steps 2-4) ─────────────────────────────────
  const handleGlobeClick = useCallback(
    (lat: number, lon: number) => {
      if (activeStep === 2) {
        playSelectSound();
        useWriteFlowStore.getState().setClientLocation(lat, lon);
      } else if (activeStep === 3) {
        playSelectSound();
        useReadFlowStore.getState().setClientLocation(lat, lon);
      } else if (activeStep === 4) {
        playSelectSound();
        useConsistencyRaceStore.getState().setClientLocation(lat, lon);
      }
    },
    [activeStep]
  );

  // ── Consistency: nearest region computation ─────────────────────────
  const consistencyClientLocation = useConsistencyRaceStore(
    (s) => s.clientLocation
  );

  const allRegionIds = useMemo(
    () => (primaryRegion ? [primaryRegion, ...readRegions] : []),
    [primaryRegion, readRegions]
  );

  const nearest = useMemo(() => {
    if (activeStep !== 4) return null;
    if (!consistencyClientLocation || allRegionIds.length === 0) return null;
    let best: { id: string; latency: number } | null = null;
    for (const id of allRegionIds) {
      const region = getRegionById(id);
      if (!region) continue;
      const latency = estimateLatencyStable(
        consistencyClientLocation.lat,
        consistencyClientLocation.lon,
        region.lat,
        region.lon
      );
      if (!best || latency < best.latency) {
        best = { id, latency };
      }
    }
    return best;
  }, [activeStep, consistencyClientLocation, allRegionIds]);

  const nearestIsPrimary = nearest?.id === primaryRegion;
  const replicaRegionId = nearest && !nearestIsPrimary ? nearest.id : null;

  // ── Failover: effective primary + camera target ─────────────────────
  const failoverPhase = useFailoverStore((s) => s.phase);
  const newPrimaryId = useFailoverStore((s) => s.newPrimaryId);

  const effectivePrimary = useMemo(() => {
    if (activeStep !== 5) return primaryRegion;
    if (failoverPhase === "idle") return primaryRegion;
    if (
      failoverPhase === "elected" ||
      failoverPhase === "recovering" ||
      failoverPhase === "complete"
    )
      return newPrimaryId;
    return null;
  }, [activeStep, failoverPhase, primaryRegion, newPrimaryId]);

  const cameraTarget = useMemo(() => {
    if (activeStep !== 5) return undefined;
    if (failoverPhase === "complete") return null;
    if (
      failoverPhase === "electing" ||
      failoverPhase === "elected" ||
      failoverPhase === "recovering"
    ) {
      if (newPrimaryId) {
        const r = getRegionById(newPrimaryId);
        if (r) return { lat: r.lat, lon: r.lon };
      }
    }
    if (primaryRegion) {
      const r = getRegionById(primaryRegion);
      if (r) return { lat: r.lat, lon: r.lon };
    }
    return null;
  }, [activeStep, failoverPhase, primaryRegion, newPrimaryId]);

  // ── Derive GlobeScene props per step ────────────────────────────────
  const globePrimaryRegion =
    activeStep === 5 ? effectivePrimary : primaryRegion;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Full-screen globe — stays mounted across ALL modes */}
      <div
        className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
          isLanding ? "translate-x-0" : "translate-x-[190px]"
        }`}
      >
        <GlobeScene
          onReady={handleGlobeReady}
          onRegionClick={
            activeStep <= 4 ? handleRegionClick : undefined
          }
          onGlobeClick={
            activeStep >= 2 && activeStep <= 4
              ? handleGlobeClick
              : undefined
          }
          selectedRegions={isLanding ? [] : readRegions}
          primaryRegion={isLanding ? null : globePrimaryRegion}
          showUserDbConnection={activeStep === 1 || activeStep === 3}
          hideUserLocation={activeStep === 2}
          cameraTarget={isLanding ? undefined : cameraTarget}
        >
          {/* Step 1: Regions */}
          {activeStep === 1 && (
            <>
              <LatencyHeatmap />
              <ConnectionArcs />
            </>
          )}

          {/* Step 2: Write */}
          {activeStep === 2 && (
            <>
              <ConnectionArcs />
              <WriteFlowVisualization />
            </>
          )}

          {/* Step 3: Read */}
          {activeStep === 3 && (
            <>
              <ConnectionArcs />
              <LatencyHeatmap />
              <ReadFlowVisualization />
            </>
          )}

          {/* Step 4: Consistency */}
          {activeStep === 4 && (
            <>
              <ConnectionArcs />
              {replicaRegionId && (
                <ConsistencyRaceVisualization
                  replicaRegionId={replicaRegionId}
                />
              )}
            </>
          )}

          {/* Step 5: Failover */}
          {activeStep === 5 && (
            <>
              {failoverPhase === "idle" && <ConnectionArcs />}
              <FailoverVisualization />
            </>
          )}
        </GlobeScene>
      </div>

      {/* Gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-72 bg-linear-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-72 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* ═══ Landing UI (step 0) ═══ */}
      <AnimatePresence>
        {isLanding && (
          <motion.div
            key="landing-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center pt-10"
          >
            <img src="/upstash-dark-bg.png" alt="Upstash" className="h-6" />

            <span className="mt-4 text-sm font-medium uppercase tracking-widest text-emerald-400">
              Interactive Guide
            </span>

            {/* Title (fades out on its own timer too) */}
            <AnimatePresence>
              {showTitle && (
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="mt-3 text-5xl font-bold tracking-tight"
                >
                  <span className="text-zinc-50">Learn </span>
                  <span className="bg-linear-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                    Upstash Redis
                  </span>
                </motion.h1>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Learn UI (steps 1-5) ═══ */}

      {/* Left panel — slides in from left */}
      <AnimatePresence mode="wait">
        {!isLanding && (
          <motion.div
            key={`left-${activeStep}`}
            variants={leftPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            className="absolute inset-y-0 left-0 z-20 w-[380px] p-4"
          >
            {activeStep === 1 && <RegionBuilder />}
            {activeStep === 2 && <WritePanel />}
            {activeStep === 3 && <ReadPanel />}
            {activeStep === 4 && (
              <ConsistencyRacePanel
                replicaRegionId={replicaRegionId}
                nearestIsPrimary={nearestIsPrimary}
              />
            )}
            {activeStep === 5 && <FailoverPanel />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right panel — slides in from right */}
      <AnimatePresence mode="wait">
        {!isLanding &&
          (activeStep === 1 ||
            activeStep === 2 ||
            activeStep === 3 ||
            activeStep === 5) && (
            <motion.div
              key={`right-${activeStep}`}
              variants={rightPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={panelTransition}
              className="absolute top-14 right-4 z-20 w-[320px]"
            >
              {activeStep === 1 && <LatencyStats />}
              {activeStep === 2 && <EventTimeline />}
              {activeStep === 3 && <LatencyComparison />}
              {activeStep === 5 && <FailoverTimeline />}
            </motion.div>
          )}
      </AnimatePresence>

      {/* Bottom: Learning Path Nav */}
      <div
        className={`absolute right-0 bottom-0 z-20 flex flex-col items-center gap-3 pb-6 transition-[left] duration-500 ease-in-out ${
          isLanding ? "left-0" : "left-[380px]"
        }`}
      >
        <LearningPathNav
          activeStep={activeStep}
          onStepChange={setActiveStep}
        />
        <p className="text-xs text-zinc-600">{HINTS[activeStep]}</p>
      </div>

      {/* Next step button */}
      <NextStepButton
        activeStep={activeStep}
        onNext={() => setActiveStep((s) => Math.min(s + 1, 5))}
      />

      {/* Loading screen (shown until globe textures load) */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>

    </div>
  );
}
