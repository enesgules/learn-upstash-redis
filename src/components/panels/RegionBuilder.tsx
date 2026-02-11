"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabaseStore } from "@/lib/store/database-store";
import { regions, getRegionById, type Region } from "@/lib/regions";
import { estimateLatencyBetweenRegions } from "@/lib/simulation/latency";
import { playSelectSound, playDeselectSound, playConnectionSound } from "@/lib/sounds";

interface ContinentGroup {
  name: string;
  regions: Region[];
}

function groupByContinent(regionList: Region[] = regions): ContinentGroup[] {
  const groups: Record<string, Region[]> = {
    "North America": [],
    "South America": [],
    Europe: [],
    "Asia Pacific": [],
    Africa: [],
  };

  for (const r of regionList) {
    if (
      r.country === "USA" ||
      r.country === "Canada"
    ) {
      groups["North America"].push(r);
    } else if (r.country === "Brazil") {
      groups["South America"].push(r);
    } else if (
      ["Ireland", "UK", "Germany", "Belgium"].includes(r.country)
    ) {
      groups["Europe"].push(r);
    } else if (
      ["India", "Japan", "Singapore", "Australia"].includes(r.country)
    ) {
      groups["Asia Pacific"].push(r);
    } else if (r.country === "South Africa") {
      groups["Africa"].push(r);
    }
  }

  return Object.entries(groups)
    .filter(([, regs]) => regs.length > 0)
    .map(([name, regs]) => ({ name, regions: regs }));
}

function RegionListItem({
  region,
  role,
  latency,
  onToggle,
  onHover,
}: {
  region: Region;
  role: "primary" | "read" | "available";
  latency: number | null;
  onToggle: () => void;
  onHover: (hovered: boolean) => void;
}) {
  return (
    <motion.button
      layout
      onClick={onToggle}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        role === "primary"
          ? "border-amber-500/30 bg-amber-500/5"
          : role === "read"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/40"
      }`}
    >
      {/* Status indicator */}
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${
          role === "primary"
            ? "bg-amber-400"
            : role === "read"
              ? "bg-emerald-400"
              : "bg-zinc-700 group-hover:bg-zinc-500"
        }`}
      />

      {/* Region info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">
            {region.city}
          </span>
          <span
            className={`rounded px-1 py-px text-[9px] font-semibold uppercase ${
              region.provider === "aws"
                ? "bg-orange-500/10 text-orange-400"
                : "bg-blue-500/10 text-blue-400"
            }`}
          >
            {region.provider}
          </span>
        </div>
        <span className="font-mono text-[11px] text-zinc-500">
          {region.code}
        </span>
      </div>

      {/* Role badge or latency */}
      <div className="shrink-0">
        {role === "primary" && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            Primary
          </span>
        )}
        {role === "read" && latency !== null && (
          <span className="font-mono text-[11px] text-emerald-400">
            {latency}ms
          </span>
        )}
      </div>
    </motion.button>
  );
}

export default function RegionBuilder() {
  const primaryRegion = useDatabaseStore((s) => s.primaryRegion);
  const readRegions = useDatabaseStore((s) => s.readRegions);
  const toggleRegion = useDatabaseStore((s) => s.toggleRegion);
  const setHoveredRegion = useDatabaseStore((s) => s.setHoveredRegion);
  const reset = useDatabaseStore((s) => s.reset);

  const activeProvider = primaryRegion ? getRegionById(primaryRegion)?.provider : null;
  const continentGroups = useMemo(() => {
    const filtered = activeProvider
      ? regions.filter((r) => r.provider === activeProvider)
      : regions;
    return groupByContinent(filtered);
  }, [activeProvider]);

  function getRole(regionId: string): "primary" | "read" | "available" {
    if (regionId === primaryRegion) return "primary";
    if (readRegions.includes(regionId)) return "read";
    return "available";
  }

  function getLatency(regionId: string): number | null {
    if (!primaryRegion || regionId === primaryRegion) return null;
    return estimateLatencyBetweenRegions(primaryRegion, regionId);
  }

  const step = !primaryRegion ? 1 : 2;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800/50 px-5 pt-5 pb-4">
        <h2 className="text-lg font-semibold text-zinc-100">
          Build Your Database
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Select a primary region, then add read replicas
        </p>

        {/* Step indicator */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step >= 1
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "border border-zinc-700 text-zinc-600"
              }`}
            >
              {primaryRegion ? "✓" : "1"}
            </div>
            <span
              className={`text-xs ${step >= 1 ? "text-zinc-300" : "text-zinc-600"}`}
            >
              Primary
            </span>
          </div>

          <div className="h-px w-4 bg-zinc-800" />

          <div className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step >= 2
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "border border-zinc-700 text-zinc-600"
              }`}
            >
              2
            </div>
            <span
              className={`text-xs ${step >= 2 ? "text-zinc-300" : "text-zinc-600"}`}
            >
              Read Replicas
            </span>
          </div>
        </div>
      </div>

      {/* Educational tip */}
      <AnimatePresence>
        {!primaryRegion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-3 overflow-hidden rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2"
          >
            <p className="text-[11px] text-zinc-400">
              Pick a primary region close to where most of your users write data.
              All writes go here first.
            </p>
          </motion.div>
        )}
        {primaryRegion && readRegions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-3 overflow-hidden rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2"
          >
            <p className="text-[11px] text-zinc-400">
              Now add read replicas. Users near a replica get fast reads without
              crossing the globe.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Region list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence mode="popLayout">
          {continentGroups.map((group) => (
            <div key={group.name} className="mb-4">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.name}
              </p>
              <div className="flex flex-col gap-1.5">
                {group.regions.map((region) => (
                  <RegionListItem
                    key={region.id}
                    region={region}
                    role={getRole(region.id)}
                    latency={getLatency(region.id)}
                    onToggle={() => {
                      const role = getRole(region.id);
                      if (role !== "available") {
                        playDeselectSound();
                      } else if (!primaryRegion) {
                        playSelectSound();
                      } else {
                        playConnectionSound();
                      }
                      toggleRegion(region.id);
                    }}
                    onHover={(h) => setHoveredRegion(h ? region.id : null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {(primaryRegion || readRegions.length > 0) && (
        <div className="shrink-0 border-t border-zinc-800/50 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {readRegions.length} replica{readRegions.length !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <button
              onClick={reset}
              className="cursor-pointer rounded-full px-3 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
