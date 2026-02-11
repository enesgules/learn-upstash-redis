"use client";

import { useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useFailoverStore } from "@/lib/store/failover-store";
import { getRegionById } from "@/lib/regions";
import { estimateLatencyBetweenRegions } from "@/lib/simulation/latency";
import { playFailureAlarmSound } from "@/lib/sounds";

const PHASE_NARRATION: Record<string, (ctx: { failedCity: string; winnerCity: string; queueCount: number }) => string> = {
  failure: ({ failedCity }) => `Primary in ${failedCity} has crashed. Incoming writes will queue...`,
  detecting: ({ queueCount }) => `Health checks detecting failure. ${queueCount} write requests queued...`,
  electing: ({ winnerCity }) => `Remaining replicas are voting for a new leader. ${winnerCity} has the lowest replication lag...`,
  elected: ({ winnerCity }) => `${winnerCity} elected as new primary!`,
  recovering: () => "New connections establishing. Queued requests are resuming...",
};

export default function FailoverPanel() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const phase = useFailoverStore((s) => s.phase);
  const failedRegionId = useFailoverStore((s) => s.failedRegionId);
  const newPrimaryId = useFailoverStore((s) => s.newPrimaryId);
  const downtimeMs = useFailoverStore((s) => s.downtimeMs);
  const events = useFailoverStore((s) => s.events);
  const killPrimary = useFailoverStore((s) => s.killPrimary);
  const reset = useFailoverStore((s) => s.reset);

  const failedRegion = failedRegionId ? getRegionById(failedRegionId) : null;
  const newPrimary = newPrimaryId ? getRegionById(newPrimaryId) : null;
  const currentPrimary = primaryRegion ? getRegionById(primaryRegion) : null;

  const latencyToOldPrimary = useMemo(() => {
    if (!failedRegionId || !newPrimaryId) return null;
    return estimateLatencyBetweenRegions(failedRegionId, newPrimaryId);
  }, [failedRegionId, newPrimaryId]);

  const handleKill = useCallback(() => {
    killPrimary();
  }, [killPrimary]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const narration =
    phase !== "idle" && phase !== "complete"
      ? PHASE_NARRATION[phase]?.({
          failedCity: failedRegion?.city ?? "unknown",
          winnerCity: newPrimary?.city ?? "unknown",
          queueCount: 3,
        })
      : null;

  const isAnimating = phase !== "idle" && phase !== "complete";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800/50 px-5 pt-5 pb-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Failover & Leader Election
        </h2>
        <p className="mt-1 text-[11px] text-zinc-500">
          Watch how Upstash handles primary failure
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {/* Cluster Status */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Cluster Status
          </p>
          <div className="space-y-1.5">
            {/* Primary */}
            {currentPrimary && (
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    phase === "idle"
                      ? "bg-amber-400"
                      : phase === "complete"
                        ? "bg-red-400 opacity-40"
                        : "bg-red-400 animate-pulse"
                  }`}
                />
                <span className="text-[11px] text-zinc-300">
                  {currentPrimary.city}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    phase === "idle"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {phase === "idle" ? "Primary" : "Failed"}
                </span>
              </div>
            )}

            {/* Read replicas */}
            {readRegions.map((id) => {
              const region = getRegionById(id);
              if (!region) return null;
              const isNewPrimary =
                id === newPrimaryId &&
                (phase === "elected" ||
                  phase === "recovering" ||
                  phase === "complete");
              return (
                <div key={id} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isNewPrimary ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-[11px] text-zinc-300">
                    {region.city}
                  </span>
                  {isNewPrimary && (
                    <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                      New Primary
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Downtime Counter */}
        <AnimatePresence>
          {phase !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Downtime
              </p>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={downtimeMs}
                  className={`font-mono text-2xl font-bold ${
                    phase === "complete" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {downtimeMs}ms
                </motion.span>
                <span className="text-[10px] text-zinc-500">
                  {phase === "complete" ? "total downtime" : "downtime..."}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase Narration */}
        <AnimatePresence mode="wait">
          {narration && (
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-[11px] italic text-zinc-400"
            >
              {narration}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Key Insight (on complete) */}
        <AnimatePresence>
          {phase === "complete" && newPrimary && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
            >
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
                Key Insight
              </p>
              <p className="text-xs leading-relaxed text-zinc-300">
                Failover completed in{" "}
                <span className="font-mono font-semibold text-cyan-400">
                  {downtimeMs}ms
                </span>
                . {newPrimary.city} was elected because it had the lowest
                replication lag
                {latencyToOldPrimary && (
                  <>
                    {" "}
                    (
                    <span className="font-mono text-emerald-400">
                      {latencyToOldPrimary}ms
                    </span>
                    )
                  </>
                )}{" "}
                from the old primary.
              </p>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                During failover, read replicas continue serving reads (possibly
                stale). Only writes are briefly interrupted. Upstash handles this
                automatically.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-800/50 px-5 py-4">
        {phase === "idle" && (
          <button
            onClick={handleKill}
            disabled={!primaryRegion || readRegions.length === 0}
            className="w-full cursor-pointer rounded-full bg-red-400/10 px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Kill Primary
          </button>
        )}
        {isAnimating && (
          <div className="text-center text-xs text-zinc-500">
            Failing over...
          </div>
        )}
        {phase === "complete" && (
          <button
            onClick={handleReset}
            className="w-full cursor-pointer rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            Reset & Try Again
          </button>
        )}
      </div>
    </motion.div>
  );
}
