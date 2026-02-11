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

export default function LearningPathNav() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="rounded-2xl border border-zinc-800/50 bg-zinc-950/80 px-5 py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-1">
        {experiences.map((exp, i) => (
          <div key={i} className="flex items-center">
            {/* Step */}
            <div className="flex items-center gap-2 px-2 py-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                  i === 0
                    ? "border border-emerald-500/50 bg-emerald-400/10 text-emerald-400"
                    : "border border-zinc-800 text-zinc-600"
                }`}
              >
                {i + 1}
              </div>
              <div className="hidden sm:block">
                <p
                  className={`text-xs font-medium ${
                    i === 0 ? "text-zinc-200" : "text-zinc-600"
                  }`}
                >
                  {exp.shortTitle}
                </p>
                <p className="hidden text-[10px] text-zinc-700 lg:block">
                  {exp.description}
                </p>
              </div>
            </div>

            {/* Connector */}
            {i < experiences.length - 1 && (
              <div className="h-px w-4 border-t border-dashed border-zinc-800" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
