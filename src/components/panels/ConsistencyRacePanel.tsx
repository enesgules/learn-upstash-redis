"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { useConsistencyRaceStore } from "@/lib/store/consistency-race-store";
import { getRegionById } from "@/lib/regions";
import {
  estimateLatency,
  estimateLatencyBetweenRegions,
  estimateLatencyStable,
} from "@/lib/simulation/latency";
import { playPacketSendSound } from "@/lib/sounds";

function predictionLabel(
  readDelay: number,
  replicationMs: number,
  readMs: number
): { text: string; color: string } {
  const margin = readDelay + readMs - replicationMs;
  if (margin <= -20) return { text: "Will be stale", color: "text-red-400" };
  if (margin <= 0) return { text: "Likely stale", color: "text-red-400" };
  if (margin <= 20) return { text: "Close race", color: "text-yellow-400" };
  return { text: "Should be fresh", color: "text-emerald-400" };
}

interface ConsistencyRacePanelProps {
  replicaRegionId: string | null;
  nearestIsPrimary: boolean;
}

export default function ConsistencyRacePanel({
  replicaRegionId,
  nearestIsPrimary,
}: ConsistencyRacePanelProps) {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);

  const clientLocation = useConsistencyRaceStore((s) => s.clientLocation);
  const phase = useConsistencyRaceStore((s) => s.phase);
  const readDelay = useConsistencyRaceStore((s) => s.readDelay);
  const isStale = useConsistencyRaceStore((s) => s.isStale);
  const replicationLatencyMs = useConsistencyRaceStore(
    (s) => s.replicationLatencyMs
  );
  const readLatencyMs = useConsistencyRaceStore((s) => s.readLatencyMs);

  const primary = primaryRegion ? getRegionById(primaryRegion) : null;
  const replica = replicaRegionId ? getRegionById(replicaRegionId) : null;

  const replicationMs = useMemo(() => {
    if (!primaryRegion || !replicaRegionId) return null;
    return estimateLatencyBetweenRegions(primaryRegion, replicaRegionId);
  }, [primaryRegion, replicaRegionId]);

  const readMs = useMemo(() => {
    if (!clientLocation || !replica) return null;
    return estimateLatencyStable(
      clientLocation.lat,
      clientLocation.lon,
      replica.lat,
      replica.lon
    );
  }, [clientLocation, replica]);

  const prediction =
    replicationMs !== null && readMs !== null
      ? predictionLabel(readDelay, replicationMs, readMs)
      : null;

  const canExecute =
    clientLocation !== null &&
    primary !== null &&
    replica !== null &&
    phase === "idle";
  const isAnimating =
    phase === "writing" ||
    phase === "write-ack" ||
    phase === "racing" ||
    phase === "result";

  const handleExecute = useCallback(() => {
    if (!clientLocation || !primary || !primaryRegion || !replica || !replicaRegionId) return;

    const primaryLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      primary.lat,
      primary.lon
    );
    const replicationLatency =
      estimateLatencyBetweenRegions(primaryRegion, replicaRegionId) ?? 150;
    const readLatency = estimateLatency(
      clientLocation.lat,
      clientLocation.lon,
      replica.lat,
      replica.lon
    );

    playPacketSendSound();
    useConsistencyRaceStore
      .getState()
      .startRace(primaryLatency, replicationLatency, readLatency);
  }, [clientLocation, primary, primaryRegion, replica, replicaRegionId]);

  const handleReplay = useCallback(() => {
    useConsistencyRaceStore.getState().reset();
  }, []);

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
          Consistency Race
        </h2>
        <p className="mt-1 text-[11px] text-zinc-500">
          Can your read outrun the replication?
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Reading from primary — no race possible */}
        {clientLocation && nearestIsPrimary && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/70 mb-2">
              No Race Needed
            </p>
            <p className="text-xs leading-relaxed text-zinc-300">
              Your nearest region is the{" "}
              <span className="font-semibold text-amber-400">
                primary ({primary?.city})
              </span>
              . Since writes and reads both go to the same region, there&apos;s
              no replication delay — you&apos;ll always read the latest value.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              Eventual consistency only affects reads from{" "}
              <span className="text-emerald-400">read replicas</span>, which
              need time to receive replicated data from the primary. Try clicking
              the globe closer to a replica region to see the race.
            </p>
          </motion.div>
        )}

        {/* Reading from indicator */}
        {clientLocation && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-zinc-600">Reading from</span>
            {nearestIsPrimary ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="font-medium text-amber-400">
                  {primary?.city}
                </span>
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                  Primary
                </span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-emerald-400">
                  {replica?.city}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                  Replica
                </span>
                {readMs !== null && (
                  <span className="font-mono text-zinc-500">~{readMs}ms</span>
                )}
              </>
            )}
          </div>
        )}

        {/* Replication context */}
        {!nearestIsPrimary && primary && replica && replicationMs !== null && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="text-zinc-600">Replication</span>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>{primary.city}</span>
            <span className="text-zinc-600">→</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{replica.city}</span>
            <span className="font-mono text-zinc-500">
              ~{replicationMs}ms
            </span>
          </div>
        )}

        {/* Prompt or Slider */}
        {!clientLocation ? (
          <p className="text-[11px] text-zinc-500 italic">
            Click the globe to place your client, then run the race
          </p>
        ) : !nearestIsPrimary ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Read Delay After Write
              </p>
              <span className="font-mono text-xs text-cyan-400">
                {readDelay}ms
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              step={5}
              value={readDelay}
              onChange={(e) =>
                useConsistencyRaceStore
                  .getState()
                  .setReadDelay(Number(e.target.value))
              }
              disabled={isAnimating}
              className="w-full accent-cyan-400 disabled:opacity-40"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              How long to wait after writing before reading from{" "}
              {replica?.city ?? "the replica"}.
              {replicationMs !== null && primary && (
                <> Replication from {primary.city} takes ~{replicationMs}ms — read too soon and {replica?.city ?? "the replica"} won&apos;t have the update yet.</>
              )}
            </p>
            {prediction && phase === "idle" && (
              <p
                className={`mt-1.5 text-xs font-medium ${prediction.color}`}
              >
                {prediction.text}
              </p>
            )}
          </div>
        ) : null}

        {/* Race Terminal */}
        {phase !== "idle" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 space-y-1 font-mono text-xs">
            <div>
              <span className="text-red-400">redis&gt;</span>{" "}
              <span className="text-zinc-200">
                SET race:value &quot;v2&quot;
              </span>
            </div>
            {(phase === "write-ack" ||
              phase === "racing" ||
              phase === "result" ||
              phase === "complete") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-emerald-400"
              >
                OK
              </motion.div>
            )}
            {(phase === "racing" ||
              phase === "result" ||
              phase === "complete") && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-zinc-500"
                >
                  [waiting {readDelay}ms...]
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-red-400">redis&gt;</span>{" "}
                  <span className="text-zinc-200">GET race:value</span>
                </motion.div>
              </>
            )}
            {(phase === "result" || phase === "complete") &&
              isStale !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    isStale ? "text-red-400 font-bold" : "text-emerald-400"
                  }
                >
                  {isStale ? '"v1" ← STALE!' : '"v2"'}
                </motion.div>
              )}
          </div>
        )}

        {/* Insight */}
        {phase === "complete" && isStale !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`rounded-xl border px-4 py-3 ${
              isStale
                ? "border-red-500/20 bg-red-500/5"
                : "border-emerald-500/20 bg-emerald-500/5"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                isStale ? "text-red-500/70" : "text-emerald-500/70"
              }`}
            >
              {isStale ? "Stale Read" : "Fresh Read"}
            </p>
            <p className="text-xs leading-relaxed text-zinc-300">
              {isStale ? (
                <>
                  Your read arrived at{" "}
                  <span className="font-semibold text-emerald-400">
                    {replica?.city}
                  </span>{" "}
                  in{" "}
                  <span className="font-mono font-semibold text-cyan-400">
                    {readDelay + readLatencyMs}ms
                  </span>{" "}
                  ({readDelay}ms delay + {readLatencyMs}ms network), but
                  replication from{" "}
                  <span className="font-semibold text-amber-400">
                    {primary?.city}
                  </span>{" "}
                  took{" "}
                  <span className="font-mono font-semibold text-emerald-400">
                    {replicationLatencyMs}ms
                  </span>
                  . The read beat replication by{" "}
                  <span className="font-mono font-semibold text-red-400">
                    {Math.abs(
                      readDelay + readLatencyMs - replicationLatencyMs
                    )}
                    ms
                  </span>
                  , so {replica?.city} still had the old value.
                </>
              ) : (
                <>
                  Replication from{" "}
                  <span className="font-semibold text-amber-400">
                    {primary?.city}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-emerald-400">
                    {replica?.city}
                  </span>{" "}
                  completed in{" "}
                  <span className="font-mono font-semibold text-emerald-400">
                    {replicationLatencyMs}ms
                  </span>
                  . Your read arrived at{" "}
                  <span className="font-mono font-semibold text-cyan-400">
                    {readDelay + readLatencyMs}ms
                  </span>{" "}
                  ({readDelay}ms delay + {readLatencyMs}ms network) — by that
                  point, {replica?.city} already had the latest data.
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              {isStale
                ? "This is eventual consistency in action. After a write, there's a brief window where replicas haven't caught up yet. Any read during that window returns stale data. Try increasing the delay to give replication enough time to finish."
                : "The replication window is typically just tens of milliseconds. As long as your read doesn't race ahead of replication, you'll always see the latest value. Try lowering the delay to find the exact boundary where staleness kicks in."}
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-800/50 px-5 py-4">
        {nearestIsPrimary ? (
          <p className="text-center text-[11px] text-zinc-600">
            Click closer to a read replica to start the race
          </p>
        ) : phase === "complete" ? (
          <button
            onClick={handleReplay}
            className="w-full rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            Run Again
          </button>
        ) : (
          <button
            onClick={handleExecute}
            disabled={!canExecute || isAnimating}
            className="w-full rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isAnimating ? "Racing..." : "Run Race"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
