import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  hasSeenWelcome: boolean;

  setWelcomeSeen: () => void;
  resetProgress: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,

      setWelcomeSeen: () => set({ hasSeenWelcome: true }),
      resetProgress: () => set({ hasSeenWelcome: false }),
    }),
    {
      name: "upstash-learn-onboarding",
    }
  )
);
