"use client";

import { Html } from "@react-three/drei";
import type { Region } from "@/lib/regions";

interface RegionTooltipProps {
  region: Region;
}

export default function RegionTooltip({ region }: RegionTooltipProps) {
  return (
    <Html
      center
      distanceFactor={8}
      style={{ pointerEvents: "none" }}
    >
      <div className="whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950/95 px-3 py-2 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100">
            {region.city}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              region.provider === "aws"
                ? "bg-orange-500/10 text-orange-400"
                : "bg-blue-500/10 text-blue-400"
            }`}
          >
            {region.provider}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">{region.code}</div>
      </div>
    </Html>
  );
}
