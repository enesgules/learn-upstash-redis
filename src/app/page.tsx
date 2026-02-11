"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import LoadingScreen from "@/components/ui/LoadingScreen";
import WelcomeOverlay from "@/components/ui/WelcomeOverlay";
import LearningPathNav from "@/components/ui/LearningPathNav";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

export default function Home() {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const isLoaded = minTimeElapsed && globeReady;

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
    if (!hasSeenWelcome && !welcomeOpen) return; // welcome still pending
    const t = setTimeout(() => setShowTitle(false), 5000);
    return () => clearTimeout(t);
  }, [isLoaded, hasSeenWelcome, welcomeOpen]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* 3D Globe (always rendered, loads in background) */}
      <div className="absolute inset-0">
        <GlobeScene onReady={handleGlobeReady} />
      </div>

      {/* Top gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-72 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* Bottom gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-72 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* Top: Brand + Subtitle (stays) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center pt-10">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500/60">
          upstash
        </span>

        <span className="mt-4 text-sm font-medium uppercase tracking-widest text-emerald-400">
          Interactive Guide
        </span>


        {/* Title (fades out) */}
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
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                Upstash Redis
              </span>
            </motion.h1>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: Learning path nav + hint */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 pb-6">
        <LearningPathNav />
        <p className="text-xs text-zinc-600">
          Drag to rotate &middot; Scroll to zoom &middot; Hover regions to
          explore
        </p>
      </div>

      {/* Loading screen (shown until globe textures load) */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>

      {/* Info button — reopens the welcome overlay */}
      <button
        onClick={() => setWelcomeOpen(true)}
        className="absolute right-5 top-5 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-xs text-zinc-500 backdrop-blur-sm transition-colors hover:border-zinc-700 hover:text-zinc-300"
      >
        ?
      </button>

      {/* Welcome overlay (first visit only + reopenable) */}
      {isLoaded && (
        <WelcomeOverlay
          forceOpen={welcomeOpen}
          onClose={() => setWelcomeOpen(false)}
        />
      )}
    </div>
  );
}
