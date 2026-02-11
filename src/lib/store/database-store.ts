import { create } from "zustand";

interface DatabaseState {
  primaryRegion: string | null;
  readRegions: string[];
  hoveredRegionId: string | null;
  setPrimary: (regionId: string) => void;
  addReadRegion: (regionId: string) => void;
  removeReadRegion: (regionId: string) => void;
  toggleRegion: (regionId: string) => void;
  setHoveredRegion: (regionId: string | null) => void;
  reset: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  primaryRegion: null,
  readRegions: [],
  hoveredRegionId: null,

  setPrimary: (regionId) =>
    set((state) => ({
      primaryRegion: regionId,
      readRegions: state.readRegions.filter((id) => id !== regionId),
    })),

  addReadRegion: (regionId) =>
    set((state) => {
      if (regionId === state.primaryRegion) return state;
      if (state.readRegions.includes(regionId)) return state;
      return { readRegions: [...state.readRegions, regionId] };
    }),

  removeReadRegion: (regionId) =>
    set((state) => ({
      readRegions: state.readRegions.filter((id) => id !== regionId),
    })),

  toggleRegion: (regionId) => {
    const state = get();
    if (!state.primaryRegion) {
      state.setPrimary(regionId);
    } else if (regionId === state.primaryRegion) {
      set({ primaryRegion: null });
    } else if (state.readRegions.includes(regionId)) {
      state.removeReadRegion(regionId);
    } else {
      state.addReadRegion(regionId);
    }
  },

  setHoveredRegion: (regionId) => set({ hoveredRegionId: regionId }),

  reset: () => set({ primaryRegion: null, readRegions: [], hoveredRegionId: null }),
}));
