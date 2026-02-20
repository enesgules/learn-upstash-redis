"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

const STORAGE_KEY = "sound-enabled";

export default function SoundToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasEnabled = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";
  const [playing, setPlaying] = useState(wasEnabled);
  const [showTooltip, setShowTooltip] = useState(false);
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);

  useEffect(() => {
    const audio = new Audio("/audio/cosmic-ambient.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = "none";
    audioRef.current = audio;

    let resumeOnInteraction: (() => void) | null = null;

    // Try to resume if user previously enabled sound
    if (playing) {
      audio.play().catch(() => {
        // Autoplay blocked — resume on first user interaction
        resumeOnInteraction = () => {
          audio.play().catch(() => {});
          document.removeEventListener("click", resumeOnInteraction!);
        };
        document.addEventListener("click", resumeOnInteraction, { once: true });
      });
    }

    return () => {
      if (resumeOnInteraction) {
        document.removeEventListener("click", resumeOnInteraction);
      }
      audio.pause();
      audio.src = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show tooltip after welcome overlay is dismissed (every page load)
  useEffect(() => {
    if (!hasSeenWelcome) return;

    const showTimer = setTimeout(() => setShowTooltip(true), 2000);
    const hideTimer = setTimeout(() => setShowTooltip(false), 6000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [hasSeenWelcome]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (showTooltip) {
      setShowTooltip(false);
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      localStorage.setItem(STORAGE_KEY, "false");
    } else {
      audio.play().then(() => setPlaying(true));
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, [playing, showTooltip]);

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Mute background sound" : "Unmute background sound"}
      className="relative flex h-11 w-11 md:h-8 md:w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-500 backdrop-blur-sm transition-colors hover:border-zinc-700 hover:text-zinc-300"
    >
      {playing ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <span
          className="absolute top-full right-1/2 mt-2 translate-x-1/2 whitespace-nowrap rounded-lg border border-emerald-500/30 bg-emerald-950/90 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md animate-fade-in"
        >
          Enable sound
          <span className="absolute -top-1 right-1/2 translate-x-1/2 h-2 w-2 rotate-45 border-l border-t border-emerald-500/30 bg-emerald-950/90" />
        </span>
      )}
    </button>
  );
}
