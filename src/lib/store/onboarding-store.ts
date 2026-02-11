import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  hasSeenWelcome: boolean;
  completedExperiences: number[];

  setWelcomeSeen: () => void;
  markExperienceComplete: (id: number) => void;
  resetProgress: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      completedExperiences: [],

      setWelcomeSeen: () => set({ hasSeenWelcome: true }),
      markExperienceComplete: (id) =>
        set((state) => ({
          completedExperiences: state.completedExperiences.includes(id)
            ? state.completedExperiences
            : [...state.completedExperiences, id],
        })),
      resetProgress: () =>
        set({ hasSeenWelcome: false, completedExperiences: [] }),
    }),
    {
      name: "upstash-learn-onboarding",
    }
  )
);
