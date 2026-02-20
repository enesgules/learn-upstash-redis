"use client";

const STEP_LABELS = ["Regions", "Write Flow", "Read Flow", "Consistency", "Failover"];

interface NextStepButtonProps {
  activeStep: number;
  onNext: () => void;
  onRestart?: () => void;
  className?: string;
}

export default function NextStepButton({ activeStep, onNext, onRestart, className = "" }: NextStepButtonProps) {
  const isLastStep = activeStep >= 5;
  const label = isLastStep ? "Start Over" : STEP_LABELS[activeStep];
  if (!label) return null;

  return (
    <button
      onClick={isLastStep ? onRestart : onNext}
      className={`fixed right-5 top-1/2 z-30 flex -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-400 backdrop-blur-sm transition-colors hover:border-emerald-500/50 hover:text-emerald-400 ${className}`}
    >
      <span>{label}</span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0"
      >
        <path
          d="M6 3l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
