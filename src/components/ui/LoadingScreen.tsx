"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]"
    >
      <p className="font-mono text-sm text-zinc-600">
        Loading the globe...
      </p>

      <div className="mt-4 flex gap-1.5">
        <span className="loading-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="loading-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="loading-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </div>
    </motion.div>
  );
}
