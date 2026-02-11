"use client";

import { motion } from "framer-motion";
import { useWriteFlowStore } from "@/lib/store/write-flow-store";

export default function InsightCard() {
  const phase = useWriteFlowStore((s) => s.phase);
  const primaryLatencyMs = useWriteFlowStore((s) => s.primaryLatencyMs);
  const replicaStatuses = useWriteFlowStore((s) => s.replicaStatuses);

  if (phase !== "complete") return null;

  const maxReplicationMs = Math.max(
    ...replicaStatuses.map((r) => r.latencyMs),
    0
  );
  const totalMs = primaryLatencyMs + maxReplicationMs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-emerald-500/20 bg-zinc-950/90 px-5 py-4 backdrop-blur-md max-w-sm"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70 mb-2">
        Key Insight
      </p>

      <p className="text-xs leading-relaxed text-zinc-300">
        Write confirmed to client in{" "}
        <span className="font-mono font-semibold text-cyan-400">
          {primaryLatencyMs}ms
        </span>
        . Full replication completed in{" "}
        <span className="font-mono font-semibold text-emerald-400">
          {totalMs}ms
        </span>
        .
      </p>

      <p className="mt-2 text-[11px] text-zinc-500">
        Replicas are eventually consistent — the client gets{" "}
        <span className="font-mono text-emerald-400">OK</span> before all
        replicas have the data.
      </p>
    </motion.div>
  );
}
