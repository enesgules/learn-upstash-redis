"use client";

import { useState } from "react";
import WelcomeOverlay from "./WelcomeOverlay";

export default function WelcomeButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-xs text-zinc-500 backdrop-blur-sm transition-colors hover:border-zinc-700 hover:text-zinc-300"
      >
        ?
      </button>

      <WelcomeOverlay forceOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
