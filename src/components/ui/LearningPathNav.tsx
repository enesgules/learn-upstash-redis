"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const experiences = [
  { shortTitle: "Globe", description: "Explore regions", href: "/" },
  { shortTitle: "Regions", description: "Build database", href: "/learn/regions" },
  { shortTitle: "Write", description: "Replicate data", href: "/learn/write" },
  { shortTitle: "Read", description: "Nearest routing", href: null },
  { shortTitle: "Consistency", description: "Stale reads", href: null },
  { shortTitle: "Failover", description: "Leader election", href: null },
];

interface LearningPathNavProps {
  activeStep?: number;
}

export default function LearningPathNav({ activeStep = 0 }: LearningPathNavProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="rounded-2xl border border-zinc-800/50 bg-zinc-950/80 px-5 py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-1">
        {experiences.map((exp, i) => {
          const isActive = i === activeStep;
          const isClickable = exp.href !== null;

          const content = (
            <div className={`flex items-center gap-2 px-2 py-1 ${isClickable && !isActive ? "cursor-pointer" : ""}`}>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "border border-emerald-500/50 bg-emerald-400/10 text-emerald-400"
                    : isClickable
                      ? "border border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                      : "border border-zinc-800 text-zinc-600"
                }`}
              >
                {i + 1}
              </div>
              <div className="hidden sm:block">
                <p
                  className={`text-xs font-medium transition-colors ${
                    isActive
                      ? "text-zinc-200"
                      : isClickable
                        ? "text-zinc-500 group-hover:text-zinc-400"
                        : "text-zinc-600"
                  }`}
                >
                  {exp.shortTitle}
                </p>
                <p className="hidden text-[10px] text-zinc-700 lg:block">
                  {exp.description}
                </p>
              </div>
            </div>
          );

          return (
            <div key={i} className="flex items-center">
              {isClickable && !isActive ? (
                <Link href={exp.href} className="group">
                  {content}
                </Link>
              ) : (
                content
              )}

              {/* Connector */}
              {i < experiences.length - 1 && (
                <div className="h-px w-4 border-t border-dashed border-zinc-800" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
