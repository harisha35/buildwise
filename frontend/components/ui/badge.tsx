import { cn } from "@/lib/utils";

export type BadgeTone = "primary" | "good" | "orange" | "purple" | "neutral";

const TONE_CLASS: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary",
  good: "bg-good-soft text-good",
  orange: "bg-orange-soft text-orange",
  purple: "bg-purple-soft text-purple",
  neutral: "bg-bg-alt text-ink-soft",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return <span className={cn("badge", TONE_CLASS[tone], className)}>{children}</span>;
}
