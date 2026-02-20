"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

const experiences = [
  {
    title: "Explore the Globe",
    description: "See all available regions and find which one is closest to you",
  },
  {
    title: "Build Your Database",
    description:
      "Set a primary region, add read replicas, and see latency heatmaps form across the globe",
  },
  {
    title: "Write Flow",
    description: "Execute a Redis write and watch it travel to the primary, get confirmed, then replicate to every read region",
  },
  {
    title: "Read Flow",
    description: "See how reads route to the nearest replica",
  },
  {
    title: "Eventual Consistency",
    description: "Race: can you read before replication finishes?",
  },
  {
    title: "Failover",
    description: "Kill the primary and watch leader election happen",
  },
];

interface WelcomeOverlayProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function WelcomeOverlay({
  forceOpen = false,
  onClose,
}: WelcomeOverlayProps) {
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);
  const setWelcomeSeen = useOnboardingStore((s) => s.setWelcomeSeen);

  useEffect(() => {
    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useOnboardingStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !hasSeenWelcome) {
      setVisible(true);
    }
  }, [hydrated, hasSeenWelcome]);

  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
    }
  }, [forceOpen]);

  function dismiss() {
    setWelcomeSeen();
    setVisible(false);
    onClose?.();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mx-4 flex max-w-lg flex-col items-center text-center max-h-screen overflow-y-auto py-8"
          >
            {/* Title */}
            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="text-zinc-50">Learn </span>
              <span className="bg-linear-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                Upstash Redis
              </span>
            </h2>

            {/* Subtitle */}
            <p className="mt-3 max-w-sm text-base leading-relaxed text-zinc-400">
              Learn distributed database concepts — replication, consistency,
              and failover — through interactive 3D visualizations of Upstash
              Redis.
            </p>

            {/* Learning path */}
            <div className="mt-6 md:mt-8 flex flex-col items-start gap-0 text-left max-h-[50vh] overflow-y-auto">
              {experiences.map((exp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  {/* Step indicator + connecting line */}
                  <div className="flex flex-col items-center self-stretch">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-xs font-medium text-zinc-400">
                      {i + 1}
                    </div>
                    {i < experiences.length - 1 && (
                      <div className="flex-1 w-px bg-zinc-800" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="pb-5">
                    <p className="text-sm font-medium text-zinc-200">
                      {exp.title}
                    </p>
                    <p className="text-xs text-zinc-500">{exp.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={dismiss}
              className="mt-6 cursor-pointer rounded-full bg-emerald-500 px-8 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              Get Started
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
