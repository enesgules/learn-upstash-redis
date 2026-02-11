import GlobeScene from "@/components/globe/GlobeScene";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Globe */}
      <div className="absolute inset-0">
        <GlobeScene />
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
