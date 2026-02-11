"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

const STORAGE_KEY = "sound-enabled";
const TOOLTIP_SEEN_KEY = "sound-tooltip-seen";

export default function SoundToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);

  useEffect(() => {
    const audio = new Audio("/audio/cosmic-ambient.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = "none";
    audioRef.current = audio;

    // Resume playback if user previously enabled sound
    const wasEnabled = localStorage.getItem(STORAGE_KEY) === "true";
    if (wasEnabled) {
      audio.play().then(() => setPlaying(true)).catch(() => {
        // Browser blocked autoplay — keep state muted until user clicks
        localStorage.setItem(STORAGE_KEY, "false");
      });
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Show tooltip once after welcome overlay is dismissed
  useEffect(() => {
    if (!hasSeenWelcome) return;
    if (localStorage.getItem(TOOLTIP_SEEN_KEY)) return;

    const showTimer = setTimeout(() => setShowTooltip(true), 2000);
    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
      localStorage.setItem(TOOLTIP_SEEN_KEY, "true");
    }, 6000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [hasSeenWelcome]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Dismiss tooltip on interaction
    if (showTooltip) {
      setShowTooltip(false);
      localStorage.setItem(TOOLTIP_SEEN_KEY, "true");
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      localStorage.setItem(STORAGE_KEY, "false");
    } else {
      audio.play();
      setPlaying(true);
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, [playing, showTooltip]);

  return (
    <div className="fixed right-5 top-5 z-30">
      <button
        onClick={toggle}
        aria-label={playing ? "Mute background sound" : "Unmute background sound"}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-500 backdrop-blur-sm transition-colors hover:border-zinc-700 hover:text-zinc-300"
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
      </button>

      {/* One-time tooltip */}
      {showTooltip && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 animate-fade-in">
          <div className="whitespace-nowrap rounded-lg border border-zinc-700/50 bg-zinc-900/95 px-3 py-1.5 text-[11px] text-zinc-300 shadow-lg backdrop-blur-sm">
            Enable sound
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 border-r border-t border-zinc-700/50 bg-zinc-900/95" />
          </div>
        </div>
      )}
    </div>
  );
}
