"use client";

import { useState } from "react";
import GlobeScene from "@/components/globe/GlobeScene";
import {
  GLOBE_TEXTURES,
  GLOBE_TINT_PRESETS,
  type GlobeTextureId,
  type GlobeTint,
} from "@/components/globe/Globe";

export default function Home() {
  const [textureId, setTextureId] = useState<GlobeTextureId>("water-4k");
  const [tint, setTint] = useState<GlobeTint>(GLOBE_TINT_PRESETS[0].tint);

  const currentConfig = GLOBE_TEXTURES.find((t) => t.id === textureId)!;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Globe */}
      <div className="absolute inset-0">
        <GlobeScene textureId={textureId} tint={tint} />
      </div>

      {/* Title overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-12">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">
          Learn Upstash Redis
        </h1>
        <p className="mt-2 text-base text-zinc-500">
          Interactive guide to global replication
        </p>
      </div>

      {/* Controls panel */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
        {/* Texture switcher */}
        <div className="flex flex-wrap justify-end gap-1.5">
          {GLOBE_TEXTURES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTextureId(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                textureId === t.id
                  ? "bg-emerald-400/20 text-emerald-400"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tint presets — only show for tintable textures */}
        {currentConfig.tintable && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {GLOBE_TINT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setTint(preset.tint)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  tint.water === preset.tint.water
                    ? "bg-zinc-700/80 text-zinc-200"
                    : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: preset.tint.water }}
                />
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-8">
        <p className="rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-sm text-zinc-400 backdrop-blur-sm">
          Hover over regions to explore &middot; Drag to rotate &middot; Scroll
          to zoom
        </p>
      </div>
    </div>
  );
}
