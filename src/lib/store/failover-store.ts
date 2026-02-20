import { create } from "zustand";
import { useDatabaseStore } from "./database-store";

export type FailoverPhase =
  | "idle"
  | "failure"
  | "detecting"
  | "electing"
  | "elected"
  | "recovering"
  | "complete";

export interface ElectionVote {
  fromRegionId: string;
  toRegionId: string;
  progress: number;
}

export interface QueuedRequest {
  id: string;
  command: string;
  clientLat: number;
  clientLon: number;
}

export type FailoverEventType = "failure" | "detect" | "election" | "elected" | "reconnect" | "resume";

export interface FailoverEvent {
  time: number;
  label: string;
  type: FailoverEventType;
}

interface FailoverState {
  phase: FailoverPhase;

  failedRegionId: string | null;
  newPrimaryId: string | null;

  failureFlashProgress: number;
  arcBreakProgress: number;
  detectionProgress: number;
  electionProgress: number;
  electionVotes: ElectionVote[];
  candidateRegionIds: string[];
  recoveryProgress: number;
  drainingProgress: number;

  queuedRequests: QueuedRequest[];
  requestQueueVisible: boolean;

  events: FailoverEvent[];
  downtimeMs: number;

  detectionTimeMs: number;
  electionTimeMs: number;
  recoveryTimeMs: number;

  originalPrimaryId: string | null;
  originalReadRegions: string[];

  killPrimary: () => void;
  setPhase: (phase: FailoverPhase) => void;
  setFailureFlashProgress: (p: number) => void;
  setArcBreakProgress: (p: number) => void;
  setDetectionProgress: (p: number) => void;
  setElectionProgress: (p: number) => void;
  setElectionVoteProgress: (fromId: string, progress: number) => void;
  onElectionComplete: () => void;
  setRecoveryProgress: (p: number) => void;
  setDrainingProgress: (p: number) => void;
  setRequestQueueVisible: (v: boolean) => void;
  addEvent: (event: FailoverEvent) => void;
  setDowntime: (ms: number) => void;
  reset: () => void;
}

const initialState = {
  phase: "idle" as FailoverPhase,
  failedRegionId: null as string | null,
  newPrimaryId: null as string | null,
  failureFlashProgress: 0,
  arcBreakProgress: 0,
  detectionProgress: 0,
  electionProgress: 0,
  electionVotes: [] as ElectionVote[],
  candidateRegionIds: [] as string[],
  recoveryProgress: 0,
  drainingProgress: 0,
  queuedRequests: [] as QueuedRequest[],
  requestQueueVisible: false,
  events: [] as FailoverEvent[],
  downtimeMs: 0,
  detectionTimeMs: 800,
  electionTimeMs: 1200,
  recoveryTimeMs: 600,
  originalPrimaryId: null as string | null,
  originalReadRegions: [] as string[],
};

export const useFailoverStore = create<FailoverState>((set, get) => ({
  ...initialState,

  killPrimary: () => {
    const dbStore = useDatabaseStore.getState();
    const { primaryRegion, readRegions } = dbStore;
    if (!primaryRegion || readRegions.length === 0) return;

    // In Upstash Redis, the primary region has 2 in-region replicas for HA.
    // Leader election happens WITHIN the same region — the new primary
    // stays in the same geographic location.
    const newPrimary = primaryRegion;

    // No cross-region election votes — election is internal to the primary region
    const votes: ElectionVote[] = [];

    // Generate queued requests at client locations (cities without Upstash regions)
    const requests: QueuedRequest[] = [
      { id: "req-0", command: 'SET user:1 "online"', clientLat: 40.7, clientLon: -74.0 },   // New York
      { id: "req-1", command: "INCR counter", clientLat: 48.9, clientLon: 2.35 },            // Paris
      { id: "req-2", command: 'SET status "active"', clientLat: 37.5, clientLon: 127.0 },    // Seoul
    ];

    set({
      phase: "failure",
      failedRegionId: primaryRegion,
      newPrimaryId: newPrimary,
      failureFlashProgress: 0,
      arcBreakProgress: 0,
      detectionProgress: 0,
      electionProgress: 0,
      electionVotes: votes,
      candidateRegionIds: [],
      recoveryProgress: 0,
      drainingProgress: 0,
      queuedRequests: requests,
      requestQueueVisible: false,
      events: [{ time: 0, label: "Primary node failed!", type: "failure" }],
      downtimeMs: 0,
      detectionTimeMs: 800,
      electionTimeMs: 1200,
      recoveryTimeMs: 600,
      originalPrimaryId: primaryRegion,
      originalReadRegions: [...readRegions],
    });
  },

  setPhase: (phase) => set({ phase }),
  setFailureFlashProgress: (p) => set({ failureFlashProgress: p }),
  setArcBreakProgress: (p) => set({ arcBreakProgress: p }),
  setDetectionProgress: (p) => set({ detectionProgress: p }),
  setElectionProgress: (p) => set({ electionProgress: p }),

  setElectionVoteProgress: (fromId, progress) =>
    set((state) => ({
      electionVotes: state.electionVotes.map((v) =>
        v.fromRegionId === fromId ? { ...v, progress } : v
      ),
    })),

  onElectionComplete: () => {
    const state = get();
    set({
      events: [
        ...state.events,
        {
          time: state.detectionTimeMs + state.electionTimeMs,
          label: `Backup replica promoted to leader!`,
          type: "elected",
        },
      ],
    });
  },

  setRecoveryProgress: (p) => set({ recoveryProgress: p }),
  setDrainingProgress: (p) => set({ drainingProgress: p }),
  setRequestQueueVisible: (v) => set({ requestQueueVisible: v }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  setDowntime: (ms) => set({ downtimeMs: ms }),

  reset: () => {
    const state = get();
    // Restore original database state
    if (state.originalPrimaryId) {
      const db = useDatabaseStore.getState();
      db.setPrimary(state.originalPrimaryId);
      for (const id of state.originalReadRegions) {
        db.addReadRegion(id);
      }
    }
    set({ ...initialState });
  },
}));
