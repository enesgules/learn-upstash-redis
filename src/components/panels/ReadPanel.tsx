"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import { getRegionById, type Region } from "@/lib/regions";
import {
  estimateLatency,
  estimateLatencyStable,
} from "@/lib/simulation/latency";
import { playPacketSendSound } from "@/lib/sounds";

function InsightInline() {
  const nearestRegionId = useReadFlowStore((s) => s.nearestRegionId);
  const nearestLatencyMs = useReadFlowStore((s) => s.nearestLatencyMs);
  const primaryLatencyMs = useReadFlowStore((s) => s.primaryLatencyMs);
  const primaryRegionId = useDatabaseStore((s) => s.primaryRegion);

  const nearestRegion = nearestRegionId
    ? getRegionById(nearestRegionId)
    : null;

  const isSameAsPrimary = nearestRegionId === primaryRegionId;

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
      {isSameAsPrimary ? (
        <>
          <p className="text-xs leading-relaxed text-zinc-300">
            Read served from the{" "}
            <span className="font-semibold text-amber-400">primary</span> (
            {nearestRegion?.city ?? nearestRegionId}) in{" "}
            <span className="font-mono font-semibold text-cyan-400">
              {nearestLatencyMs}ms
            </span>
            . The primary is already the closest region to you.
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Try placing your client closer to a read replica to see the
            routing advantage.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-zinc-300">
            Read served from{" "}
            <span className="font-semibold text-emerald-400">
              {nearestRegion?.city ?? nearestRegionId}
            </span>{" "}
            in{" "}
            <span className="font-mono font-semibold text-cyan-400">
              {nearestLatencyMs}ms
            </span>
            . Reading from primary would take{" "}
            <span className="font-mono font-semibold text-zinc-400">
              {primaryLatencyMs}ms
            </span>{" "}
            — {(primaryLatencyMs / nearestLatencyMs).toFixed(1)}x slower!
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Upstash routes reads to the nearest replica automatically, giving
            low-latency access from anywhere.
          </p>
        </>
      )}
    </motion.div>
  );
}

export default function ReadPanel() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);

  const clientLocation = useReadFlowStore((s) => s.clientLocation);
  const phase = useReadFlowStore((s) => s.phase);
  const command = useReadFlowStore((s) => s.command);
  const response = useReadFlowStore((s) => s.response);
  const fetchProgress = useReadFlowStore((s) => s.fetchProgress);
  const nearestLatencyMs = useReadFlowStore((s) => s.nearestLatencyMs);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  // Find nearest region in real-time as client moves
  const allRegionIds = useMemo(
    () => (primaryRegion ? [primaryRegion, ...readRegions] : []),
    [primaryRegion, readRegions]
  );

  const nearest = useMemo(() => {
    if (!clientLocation || allRegionIds.length === 0) return null;
    let best: { id: string; latency: number; region: Region } | null = null;
    for (const id of allRegionIds) {
      const region = getRegionById(id);
      if (!region) continue;
      const latency = estimateLatencyStable(
        clientLocation.lat,
        clientLocation.lon,
        region.lat,
        region.lon
      );
      if (!best || latency < best.latency) {
        best = { id, latency, region };
      }
    }
    return best;
  }, [clientLocation, allRegionIds]);

  const canExecute =
    clientLocation !== null && nearest !== null && phase === "idle";
  const isAnimating =
    phase === "fetching" || phase === "arriving" || phase === "responding";

  const handleExecute = useCallback(() => {
    if (!clientLocation || !nearest || !primary || !primaryRegion) return;

    const nearestLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      nearest.region.lat,
      nearest.region.lon
    );
    const primaryLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );

    playPacketSendSound();
    useReadFlowStore
      .getState()
      .startRead(nearest.id, nearestLatency, primaryLatency);
  }, [clientLocation, nearest, primary, primaryRegion]);

  const handleReplay = useCallback(() => {
    useReadFlowStore.getState().reset();
  }, []);

  const displayedLatency =
    phase === "fetching"
      ? Math.round(fetchProgress * nearestLatencyMs)
      : phase !== "idle" && nearestLatencyMs > 0
        ? nearestLatencyMs
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
        <h2 className="text-sm font-semibold text-zinc-200">Read Flow</h2>
        <p className="mt-1 text-[11px] text-zinc-500">
          See how reads route to the nearest replica for low latency
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

        {/* Nearest Region (real-time) */}
        {nearest && phase === "idle" && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
              Nearest Region
            </p>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-xs">→</span>
              <span className="text-[11px] text-zinc-300">
                {nearest.region.city}
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                ~{nearest.latency}ms
              </span>
            </div>
          </div>
        )}

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
                  useReadFlowStore.getState().setCommand(e.target.value)
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
              {phase === "fetching" ? "fetching..." : "read latency"}
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
