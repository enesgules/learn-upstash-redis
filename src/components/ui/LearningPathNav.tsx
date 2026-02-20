"use client";

import { motion } from "framer-motion";

const experiences = [
  { shortTitle: "Globe", description: "Explore regions" },
  { shortTitle: "Regions", description: "Build database" },
  { shortTitle: "Write", description: "Replicate data" },
  { shortTitle: "Read", description: "Nearest routing" },
  { shortTitle: "Consistency", description: "Stale reads" },
  { shortTitle: "Failover", description: "Leader election" },
];

interface LearningPathNavProps {
  activeStep?: number;
  onStepChange?: (step: number) => void;
  compact?: boolean;
}

export default function LearningPathNav({ activeStep = 0, onStepChange, compact = false }: LearningPathNavProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className={
        compact
          ? "rounded-xl border border-zinc-800/50 bg-zinc-950/80 px-1.5 py-1.5 backdrop-blur-md"
          : "rounded-2xl border border-zinc-800/50 bg-zinc-950/80 px-2 py-2 md:px-5 md:py-3 backdrop-blur-md"
      }
    >
      <div className={`flex items-center ${compact ? "gap-0" : "gap-1"}`}>
        {experiences.map((exp, i) => {
          const isActive = i === activeStep;
          const isClickable = !isActive && onStepChange;

          const content = (
            <div className={`flex items-center gap-2 ${compact ? "px-1 py-1" : "px-2 py-2.5 md:py-1"} ${isClickable ? "cursor-pointer" : ""}`}>
              <div
                className={`flex items-center justify-center rounded-full font-semibold transition-colors ${
                  compact ? "h-6 w-6 text-[9px]" : "h-7 w-7 md:h-6 md:w-6 text-[10px]"
                } ${
                  isActive
                    ? "border border-emerald-500/50 bg-emerald-400/10 text-emerald-400"
                    : "border border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                }`}
              >
                {i + 1}
              </div>
              {!compact && (
                <div className="hidden sm:block">
                  <p
                    className={`text-xs font-medium transition-colors ${
                      isActive
                        ? "text-zinc-200"
                        : "text-zinc-500 group-hover:text-zinc-400"
                    }`}
                  >
                    {exp.shortTitle}
                  </p>
                  <p className="hidden text-[10px] text-zinc-700 lg:block">
                    {exp.description}
                  </p>
                </div>
              )}
            </div>
          );

          return (
            <div key={i} className="flex items-center">
              <button
                onClick={isClickable ? () => onStepChange(i) : undefined}
                className={`group ${isClickable ? "cursor-pointer" : "cursor-default"}`}
              >
                {content}
              </button>

              {/* Connector */}
              {i < experiences.length - 1 && (
                <div className={`h-px border-t border-dashed border-zinc-800 ${compact ? "w-1" : "w-2 md:w-4"}`} />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
