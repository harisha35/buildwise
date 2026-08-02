import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "good" | "purple" | "orange";
  icon?: React.ReactNode;
}

const TONE_CLASS = {
  primary: "bg-primary-soft text-primary",
  good: "bg-good-soft text-good",
  purple: "bg-purple-soft text-purple",
  orange: "bg-orange-soft text-orange",
};

export function StatCard({ label, value, hint, tone = "primary", icon }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
          <p className="tabular mt-2 text-2xl font-extrabold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs font-semibold text-ink-soft">{hint}</p>}
        </div>
        {icon && <div className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-field", TONE_CLASS[tone])}>{icon}</div>}
      </div>
    </div>
  );
}
