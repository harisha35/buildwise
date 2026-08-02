import { cn } from "@/lib/utils";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold", className)}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <path d="M3 16h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6.5 16V9.5M17.5 16V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3 9.5c3.2-4 14.8-4 18 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {!mark && "BUILDWISE"}
    </span>
  );
}
