"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import ConnectionArcs from "@/components/globe/ConnectionArcs";
import LatencyHeatmap from "@/components/globe/LatencyHeatmap";
import WriteFlowVisualization from "@/components/globe/WriteFlowVisualization";
import ReadFlowVisualization from "@/components/globe/ReadFlowVisualization";
import ConsistencyRaceVisualization from "@/components/globe/ConsistencyRaceVisualization";
import ClientMarker from "@/components/globe/ClientMarker";
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
const desktopLeftPanelVariants = {
  hidden: { x: -400, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: -400, opacity: 0 },
};

const mobileLeftPanelVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: 40, opacity: 0 },
};

const rightPanelVariants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
};

const panelTransition = { type: "spring" as const, damping: 25, stiffness: 200 };

// ── Mobile next step labels ──────────────────────────────────────────
const NEXT_LABELS = ["Regions", "Write", "Read", "Consistency", "Failover"];

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
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

  // ── Mobile detection ──────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Responsive Framer variants ────────────────────────────────────
  const leftPanelVariants = isMobile
    ? mobileLeftPanelVariants
    : desktopLeftPanelVariants;

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

  // ── Right panel content (shared between desktop floating + mobile split) ──
  const hasRightPanel = [1, 2, 3, 5].includes(activeStep) && !isLanding;
  const rightPanelContent = (
    <>
      {activeStep === 1 && <LatencyStats />}
      {activeStep === 2 && !isMobile && <EventTimeline />}
      {activeStep === 3 && <LatencyComparison />}
      {activeStep === 5 && <FailoverTimeline />}
    </>
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Full-screen globe — stays mounted across ALL modes */}
      <div
        className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
          isLanding ? "translate-x-0" : "-translate-y-[20vh] md:translate-y-0 md:translate-x-[190px]"
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
              {replicaRegionId ? (
                <ConsistencyRaceVisualization
                  replicaRegionId={replicaRegionId}
                />
              ) : (
                /* Client marker when nearest is primary (no race visualization) */
                consistencyClientLocation && (
                  <ClientMarker lat={consistencyClientLocation.lat} lon={consistencyClientLocation.lon} />
                )
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 md:h-72 bg-linear-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 md:h-72 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* ═══ Landing UI (step 0) ═══ */}
      <AnimatePresence>
        {isLanding && (
          <motion.div
            key="landing-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-16 md:pt-10"
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
                  className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center"
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

      {/* Left panel — desktop: sidebar from left, mobile: split-screen bottom half */}
      <AnimatePresence mode="wait">
        {!isLanding && (
          <motion.div
            key={`left-${activeStep}`}
            variants={leftPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            className="z-20 fixed top-[50vh] bottom-0 left-0 right-0 flex flex-col rounded-t-2xl border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-md md:absolute md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-[380px] md:rounded-none md:border-0 md:bg-transparent md:backdrop-blur-none md:p-4"
          >
            {/* Panel content — scrollable on mobile */}
            <div className="flex-1 overflow-y-auto p-4 md:p-0 md:h-full min-h-0">
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

              {/* Mobile-only: right panel content stacked below left panel */}
              {hasRightPanel && (
                <div className="md:hidden mt-3">
                  {rightPanelContent}
                </div>
              )}
            </div>

            {/* Mobile bottom bar: back + nav + next */}
            <div className="md:hidden shrink-0 flex items-center justify-between gap-1.5 px-2 py-2 border-t border-zinc-800/50 pb-safe">
              {/* Back button */}
              <button
                onClick={() => setActiveStep((s) => Math.max(s - 1, 0))}
                className={`shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-400 cursor-pointer transition-colors hover:border-emerald-500/50 hover:text-emerald-400 ${
                  activeStep <= 0 ? "opacity-30 pointer-events-none" : ""
                }`}
                aria-label="Previous step"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <LearningPathNav
                activeStep={activeStep}
                onStepChange={setActiveStep}
                compact
              />

              {/* Next / Restart button */}
              <button
                onClick={() => activeStep >= 5 ? setActiveStep(0) : setActiveStep((s) => Math.min(s + 1, 5))}
                className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-400 cursor-pointer transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                aria-label={activeStep >= 5 ? "Start over" : "Next step"}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right panel — desktop only, slides in from right */}
      <AnimatePresence mode="wait">
        {hasRightPanel && (
          <motion.div
            key={`right-${activeStep}`}
            variants={rightPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            className="hidden md:block absolute top-14 right-4 z-20 w-[320px]"
          >
            {rightPanelContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: Learning Path Nav — desktop only */}
      <div
        className={`hidden md:flex absolute right-0 z-20 flex-col items-center gap-3 pb-6 transition-all duration-500 ease-in-out left-0 ${
          isLanding
            ? "bottom-0"
            : "bottom-0 md:left-[380px]"
        }`}
      >
        <LearningPathNav
          activeStep={activeStep}
          onStepChange={setActiveStep}
        />
        <p className="text-xs text-zinc-600">{HINTS[activeStep]}</p>
      </div>

      {/* Mobile: Landing nav (step 0 only, since steps 1-5 have nav in panel) */}
      {isLanding && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 pb-4">
          <LearningPathNav
            activeStep={activeStep}
            onStepChange={setActiveStep}
          />
        </div>
      )}

      {/* Back step button — desktop only */}
      {!isLanding && activeStep > 0 && (
        <button
          onClick={() => setActiveStep((s) => Math.max(s - 1, 0))}
          className="hidden md:flex fixed left-[396px] top-1/2 z-30 -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-400 backdrop-blur-sm transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back</span>
        </button>
      )}

      {/* Next step button — desktop only */}
      <NextStepButton
        activeStep={activeStep}
        onNext={() => setActiveStep((s) => Math.min(s + 1, 5))}
        onRestart={() => setActiveStep(0)}
        className="hidden md:flex"
      />

      {/* Loading screen (shown until globe textures load) */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>

    </div>
  );
}
