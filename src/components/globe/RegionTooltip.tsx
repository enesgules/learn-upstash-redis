"use client";

import { Html } from "@react-three/drei";
import type { Region } from "@/lib/regions";

interface NavigationHint {
  text: string;
  onClick: () => void;
}

interface RegionTooltipProps {
  regions: Region[];
  navigationHint?: NavigationHint;
}

export default function RegionTooltip({ regions, navigationHint }: RegionTooltipProps) {
  const city = regions[0].city;

  return (
    <Html
      center
      distanceFactor={5}
      zIndexRange={[1, 0]}
      style={{ pointerEvents: "none", transform: "translateY(-24px)" }}
    >
      <div className="whitespace-nowrap rounded-lg border border-emerald-500/30 bg-zinc-950/95 px-3 py-2 shadow-[0_0_12px_rgba(16,185,129,0.15)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-zinc-50">
            {city}
          </span>
          <div className="flex gap-1">
            {regions.map((r) => (
              <span
                key={r.id}
                className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${
                  r.provider === "aws"
                    ? "bg-orange-500/15 text-orange-400"
                    : "bg-blue-500/15 text-blue-400"
                }`}
              >
                {r.provider}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {regions.map((r) => (
            <div key={r.id} className="text-[10px] font-mono text-zinc-400">
              {r.code}
            </div>
          ))}
        </div>
        {navigationHint && (
          <button
            onClick={navigationHint.onClick}
            style={{ pointerEvents: "auto" }}
            className="mt-2 flex w-full cursor-pointer items-center gap-1 border-t border-emerald-500/20 pt-2 text-[11px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            {navigationHint.text}
            <span aria-hidden>&#8594;</span>
          </button>
        )}
      </div>
    </Html>
  );
}
