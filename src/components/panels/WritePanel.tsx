"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";
import { getRegionById } from "@/lib/regions";
import {
  estimateLatency,
  estimateLatencyBetweenRegions,
} from "@/lib/simulation/latency";
import { playPacketSendSound } from "@/lib/sounds";

function InsightInline() {
  const primaryLatencyMs = useWriteFlowStore((s) => s.primaryLatencyMs);
  const replicaStatuses = useWriteFlowStore((s) => s.replicaStatuses);

  const maxReplicationMs = Math.max(
    ...replicaStatuses.map((r) => r.latencyMs),
    0
  );
  const totalMs = primaryLatencyMs + maxReplicationMs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70 mb-1.5">
        Key Insight
      </p>
      <p className="text-xs leading-relaxed text-zinc-300">
        Write confirmed in{" "}
        <span className="font-mono font-semibold text-cyan-400">
          {primaryLatencyMs}ms
        </span>
        . Full replication in{" "}
        <span className="font-mono font-semibold text-emerald-400">
          {totalMs}ms
        </span>
        .
      </p>
      <p className="mt-1.5 text-[11px] text-zinc-500">
        Replicas are eventually consistent — the client gets{" "}
        <span className="font-mono text-emerald-400">OK</span> before all
        replicas have the data.
      </p>
    </motion.div>
  );
}

export default function WritePanel() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const clientLocation = useWriteFlowStore((s) => s.clientLocation);
  const phase = useWriteFlowStore((s) => s.phase);
  const command = useWriteFlowStore((s) => s.command);
  const response = useWriteFlowStore((s) => s.response);
  const primaryProgress = useWriteFlowStore((s) => s.primaryProgress);
  const primaryLatencyMs = useWriteFlowStore((s) => s.primaryLatencyMs);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  const canExecute =
    clientLocation !== null && primary !== null && phase === "idle";
  const isAnimating =
    phase === "to-primary" ||
    phase === "primary-ack" ||
    phase === "replicating";

  const handleExecute = useCallback(() => {
    if (!clientLocation || !primary || !primaryRegion) return;

    const primaryLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );

    const replicas = readRegions
      .map((id) => {
        const latency = estimateLatencyBetweenRegions(primaryRegion, id);
        return latency !== null ? { regionId: id, latencyMs: latency } : null;
      })
      .filter((r) => r !== null);

    playPacketSendSound();
    useWriteFlowStore.getState().startAnimation(primaryLatency, replicas);
  }, [clientLocation, primary, primaryRegion, readRegions]);

  const handleReplay = useCallback(() => {
    useWriteFlowStore.getState().reset();
  }, []);

  const displayedLatency =
    phase === "to-primary"
      ? Math.round(primaryProgress * primaryLatencyMs)
      : phase !== "idle"
        ? primaryLatencyMs
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800/50 px-5 pt-5 pb-4">
        <h2 className="text-sm font-semibold text-zinc-200">Write Flow</h2>
        <p className="mt-1 text-[11px] text-zinc-500">
          Watch data travel from client to primary, then replicate to all
          regions
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Region Summary */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
            Database Config
          </p>
          <div className="space-y-2">
            {primary && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                  Primary
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {primary.city}
                </span>
              </div>
            )}
            {readRegions.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Read
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {readRegions.map((id) => {
                    const region = getRegionById(id);
                    if (!region) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {region.city}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client Location */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
            Client Location
          </p>
          {clientLocation ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="font-mono text-xs text-zinc-300">
                {clientLocation.lat.toFixed(1)}°,{" "}
                {clientLocation.lon.toFixed(1)}°
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic">
              Click anywhere on the globe to set your location
            </p>
          )}
        </div>

        {/* Redis Terminal */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
            Command
          </p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-red-400 shrink-0">
                redis&gt;
              </span>
              <input
                type="text"
                value={command}
                onChange={(e) =>
                  useWriteFlowStore.getState().setCommand(e.target.value)
                }
                disabled={phase !== "idle"}
                className="flex-1 bg-transparent font-mono text-xs text-zinc-200 outline-none placeholder-zinc-600 disabled:opacity-50"
                spellCheck={false}
              />
            </div>
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 font-mono text-xs text-emerald-400"
              >
                {response}
              </motion.div>
            )}
          </div>
        </div>

        {/* Latency counter */}
        {displayedLatency !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-baseline gap-2"
          >
            <span className="font-mono text-lg font-bold text-cyan-400">
              {displayedLatency}ms
            </span>
            <span className="text-[10px] text-zinc-500">
              {phase === "to-primary" ? "traveling..." : "write latency"}
            </span>
          </motion.div>
        )}

        {/* Key Insight — shown after animation completes */}
        {phase === "complete" && <InsightInline />}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-800/50 px-5 py-4">
        {phase === "complete" ? (
          <button
            onClick={handleReplay}
            className="w-full rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            Replay
          </button>
        ) : (
          <button
            onClick={handleExecute}
            disabled={!canExecute || isAnimating}
            className="w-full rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isAnimating ? "Executing..." : "Execute"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
