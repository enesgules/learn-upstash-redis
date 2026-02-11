"use client";

import { Html } from "@react-three/drei";
import type { Region } from "@/lib/regions";

interface RegionTooltipProps {
  regions: Region[];
}

export default function RegionTooltip({ regions }: RegionTooltipProps) {
  const city = regions[0].city;

  return (
    <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-950/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-zinc-100">
            {city}
          </span>
          <div className="flex gap-1">
            {regions.map((r) => (
              <span
                key={r.id}
                className={`rounded px-1 py-px text-[8px] font-semibold uppercase ${
                  r.provider === "aws"
                    ? "bg-orange-500/10 text-orange-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {r.provider}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-0.5 flex flex-col gap-px">
          {regions.map((r) => (
            <div key={r.id} className="text-[9px] text-zinc-500">
              {r.code}
            </div>
          ))}
        </div>
      </div>
    </Html>
  );
}
