"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlobeScene from "@/components/globe/GlobeScene";
import LoadingScreen from "@/components/ui/LoadingScreen";
import LearningPathNav from "@/components/ui/LearningPathNav";
import WelcomeButton from "@/components/ui/WelcomeButton";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

export default function Home() {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
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
    if (!hasSeenWelcome) return; // welcome still pending
    const t = setTimeout(() => setShowTitle(false), 5000);
    return () => clearTimeout(t);
  }, [isLoaded, hasSeenWelcome]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* 3D Globe (always rendered, loads in background) */}
      <div className="absolute inset-0">
        <GlobeScene
          onReady={handleGlobeReady}
          regionNavigationHint={{ text: "Start building your database", href: "/learn/regions" }}
        />
      </div>

      {/* Top gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-72 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* Bottom gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-72 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* Top: Brand + Subtitle (stays) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center pt-10">
        <img src="/upstash-dark-bg.png" alt="Upstash" className="h-6" />

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
        <LearningPathNav activeStep={0} />
        <p className="text-xs text-zinc-600">
          Drag to rotate &middot; Scroll to zoom &middot; Hover regions to
          explore
        </p>
      </div>

      {/* Loading screen (shown until globe textures load) */}
      <AnimatePresence>{!isLoaded && <LoadingScreen />}</AnimatePresence>

      {/* Welcome overlay button (homepage only) */}
      <WelcomeButton />
    </div>
  );
}
