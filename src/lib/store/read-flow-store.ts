import { create } from "zustand";

export type ReadPhase =
  | "idle"
  | "fetching"
  | "arriving"
  | "responding"
  | "complete";

interface ReadFlowState {
  clientLocation: { lat: number; lon: number } | null;
  phase: ReadPhase;
  fetchProgress: number;
  responseProgress: number;
  nearestRegionId: string | null;
  nearestLatencyMs: number;
  primaryLatencyMs: number;
  command: string;
  response: string | null;

  setClientLocation: (lat: number, lon: number) => void;
  setCommand: (cmd: string) => void;
  startRead: (
    nearestId: string,
    nearestLatency: number,
    primaryLatency: number
  ) => void;
  setFetchProgress: (p: number) => void;
  onDataFetched: () => void;
  setResponseProgress: (p: number) => void;
  setPhase: (phase: ReadPhase) => void;
  reset: () => void;
}

export const useReadFlowStore = create<ReadFlowState>((set, get) => ({
  clientLocation: null,
  phase: "idle",
  fetchProgress: 0,
  responseProgress: 0,
  nearestRegionId: null,
  nearestLatencyMs: 0,
  primaryLatencyMs: 0,
  command: "GET mykey",
  response: null,

  setClientLocation: (lat, lon) => {
    const state = get();
    if (state.phase !== "idle") {
      set({
        phase: "idle",
        fetchProgress: 0,
        responseProgress: 0,
        nearestRegionId: null,
        nearestLatencyMs: 0,
        primaryLatencyMs: 0,
        response: null,
      });
    }
    set({ clientLocation: { lat, lon } });
  },

  setCommand: (cmd) => set({ command: cmd }),

  startRead: (nearestId, nearestLatency, primaryLatency) =>
    set({
      phase: "fetching",
      fetchProgress: 0,
      responseProgress: 0,
      nearestRegionId: nearestId,
      nearestLatencyMs: nearestLatency,
      primaryLatencyMs: primaryLatency,
      response: null,
    }),

  setFetchProgress: (p) => set({ fetchProgress: p }),

  onDataFetched: () =>
    set({
      phase: "arriving",
      fetchProgress: 1,
    }),

  setResponseProgress: (p) => set({ responseProgress: p }),

  setPhase: (phase) => set({ phase }),

  reset: () =>
    set({
      phase: "idle",
      fetchProgress: 0,
      responseProgress: 0,
      nearestRegionId: null,
      nearestLatencyMs: 0,
      primaryLatencyMs: 0,
      response: null,
    }),
}));
