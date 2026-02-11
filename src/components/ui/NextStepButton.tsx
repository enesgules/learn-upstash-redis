"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { path: "/", label: "Regions", href: "/learn/regions" },
  { path: "/learn/regions", label: "Write Flow", href: "/learn/write" },
  { path: "/learn/write", label: "Read Flow", href: "/learn/read" },
  { path: "/learn/read", label: "Consistency", href: "/learn/consistency" },
  { path: "/learn/consistency", label: "Failover", href: "/learn/failover" },
];

export default function NextStepButton() {
  const pathname = usePathname();
  const next = steps.find((s) => s.path === pathname);

  if (!next) return null;

  return (
    <Link
      href={next.href}
      className="fixed right-5 top-1/2 z-30 flex -translate-y-1/2 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-400 backdrop-blur-sm transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
    >
      <span>{next.label}</span>
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
    </Link>
  );
}
