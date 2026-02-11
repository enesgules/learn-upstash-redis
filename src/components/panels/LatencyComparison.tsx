"use client";

import { motion } from "framer-motion";
import { useReadFlowStore } from "@/lib/store/read-flow-store";
import { useDatabaseStore } from "@/lib/store/database-store";
import { getRegionById } from "@/lib/regions";

export default function LatencyComparison() {
  const phase = useReadFlowStore((s) => s.phase);
  const nearestRegionId = useReadFlowStore((s) => s.nearestRegionId);
  const nearestLatencyMs = useReadFlowStore((s) => s.nearestLatencyMs);
  const primaryLatencyMs = useReadFlowStore((s) => s.primaryLatencyMs);
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);

  if (phase !== "complete") return null;

  const nearestRegion = nearestRegionId
    ? getRegionById(nearestRegionId)
    : null;
  const primary = primaryRegion ? getRegionById(primaryRegion) : null;

  const savedMs = primaryLatencyMs - nearestLatencyMs;
  const savingsPercent =
    primaryLatencyMs > 0
      ? Math.round((savedMs / primaryLatencyMs) * 100)
      : 0;

  const isSameRegion = nearestRegionId === primaryRegion;

  // Don't show comparison when reading from primary — no comparison to make
  if (isSameRegion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-zinc-800/50 bg-zinc-950/90 px-5 py-4 backdrop-blur-md"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-3">
        Latency Comparison
      </p>

      <div className="space-y-3">
        {/* Nearest replica */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-sm">✓</span>
            <div>
              <p className="text-xs font-medium text-zinc-200">
                Nearest replica
              </p>
              <p className="text-[10px] text-zinc-500">
                {nearestRegion?.city ?? nearestRegionId}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-400">
            {nearestLatencyMs}ms
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-800/50" />

        {/* Primary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 text-sm">○</span>
            <div>
              <p className="text-xs font-medium text-zinc-400">Primary</p>
              <p className="text-[10px] text-zinc-600">
                {primary?.city ?? primaryRegion}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-semibold text-zinc-400">
            {primaryLatencyMs}ms
          </span>
        </div>

        {/* Savings */}
        {savedMs > 0 && (
          <>
            <div className="h-px bg-zinc-800/50" />
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-xs">⚡</span>
              <p className="text-[11px] text-emerald-400 font-medium">
                {savingsPercent}% faster (saved {savedMs}ms)
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
