"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useFailoverStore, type FailoverPhase } from "@/lib/store/failover-store";

const typeStyles: Record<string, { icon: string; color: string }> = {
  failure: { icon: "✕", color: "text-red-400" },
  detect: { icon: "⚠", color: "text-amber-400" },
  election: { icon: "↻", color: "text-amber-400" },
  elected: { icon: "★", color: "text-amber-400" },
  reconnect: { icon: "→", color: "text-emerald-400" },
  resume: { icon: "✓", color: "text-emerald-400" },
};

function getWriteStatus(phase: FailoverPhase): { label: string; color: string } {
  if (phase === "idle") return { label: "OK", color: "text-emerald-400" };
  if (phase === "complete") return { label: "OK", color: "text-emerald-400" };
  if (phase === "recovering") return { label: "Draining", color: "text-amber-400" };
  return { label: "Blocked", color: "text-red-400" };
}

function getReadStatus(phase: FailoverPhase): { label: string; color: string } {
  if (phase === "idle") return { label: "OK", color: "text-emerald-400" };
  return { label: "OK (possibly stale)", color: "text-emerald-400" };
}

export default function FailoverTimeline() {
  const events = useFailoverStore((s) => s.events);
  const phase = useFailoverStore((s) => s.phase);

  if (phase === "idle" || events.length === 0) return null;

  const writeStatus = getWriteStatus(phase);
  const readStatus = getReadStatus(phase);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-h-[400px] overflow-y-auto rounded-2xl border border-zinc-800/50 bg-zinc-950/90 px-5 py-4 backdrop-blur-md"
    >
      {/* Live status */}
      <div className="mb-3 flex gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
            Writes
          </p>
          <p className={`text-[11px] font-semibold ${writeStatus.color}`}>
            {writeStatus.label}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
            Reads
          </p>
          <p className={`text-[11px] font-semibold ${readStatus.color}`}>
            {readStatus.label}
          </p>
        </div>
      </div>

      <div className="mb-3 h-px bg-zinc-800/50" />

      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        Failover Timeline
      </p>

      <div className="space-y-1.5">
        <AnimatePresence>
          {events.map((event, i) => {
            const style = typeStyles[event.type] ?? typeStyles.failure;
            return (
              <motion.div
                key={`${event.time}-${event.type}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.05 * i }}
                className="flex items-start gap-3"
              >
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-zinc-500">
                  {event.time}ms
                </span>
                <span className={`shrink-0 text-sm ${style.color}`}>
                  {style.icon}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {event.label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
