import { create } from "zustand";

export type ConsistencyPhase =
  | "idle"
  | "writing"
  | "write-ack"
  | "racing"
  | "result"
  | "complete";

interface ConsistencyRaceState {
  clientLocation: { lat: number; lon: number } | null;
  phase: ConsistencyPhase;
  readDelay: number;

  writeProgress: number;
  replicationProgress: number;
  readProgress: number;
  readStarted: boolean;

  primaryLatencyMs: number;
  replicationLatencyMs: number;
  readLatencyMs: number;

  isStale: boolean | null;

  setClientLocation: (lat: number, lon: number) => void;
  setReadDelay: (delayMs: number) => void;
  startRace: (
    primaryLatency: number,
    replicationLatency: number,
    readLatency: number
  ) => void;
  setWriteProgress: (p: number) => void;
  setReplicationProgress: (p: number) => void;
  setReadProgress: (p: number) => void;
  markReadStarted: () => void;
  setPhase: (phase: ConsistencyPhase) => void;
  onRaceResult: (isStale: boolean) => void;
  reset: () => void;
}

export const useConsistencyRaceStore = create<ConsistencyRaceState>(
  (set, get) => ({
    clientLocation: null,
    phase: "idle",
    readDelay: 120,

    writeProgress: 0,
    replicationProgress: 0,
    readProgress: 0,
    readStarted: false,

    primaryLatencyMs: 0,
    replicationLatencyMs: 0,
    readLatencyMs: 0,

    isStale: null,

    setClientLocation: (lat, lon) => {
      const state = get();
      if (state.phase !== "idle") {
        set({
          phase: "idle",
          writeProgress: 0,
          replicationProgress: 0,
          readProgress: 0,
          readStarted: false,
          isStale: null,
        });
      }
      set({ clientLocation: { lat, lon } });
    },

    setReadDelay: (delayMs) => set({ readDelay: delayMs }),

    startRace: (primaryLatency, replicationLatency, readLatency) =>
      set({
        phase: "writing",
        writeProgress: 0,
        replicationProgress: 0,
        readProgress: 0,
        readStarted: false,
        primaryLatencyMs: primaryLatency,
        replicationLatencyMs: replicationLatency,
        readLatencyMs: readLatency,
        isStale: null,
      }),

    setWriteProgress: (p) => set({ writeProgress: p }),
    setReplicationProgress: (p) => set({ replicationProgress: p }),
    setReadProgress: (p) => set({ readProgress: p }),
    markReadStarted: () => set({ readStarted: true }),

    setPhase: (phase) => set({ phase }),

    onRaceResult: (isStale) =>
      set({
        phase: "result",
        isStale,
      }),

    reset: () =>
      set({
        phase: "idle",
        writeProgress: 0,
        replicationProgress: 0,
        readProgress: 0,
        readStarted: false,
        primaryLatencyMs: 0,
        replicationLatencyMs: 0,
        readLatencyMs: 0,
        isStale: null,
      }),
  })
);
