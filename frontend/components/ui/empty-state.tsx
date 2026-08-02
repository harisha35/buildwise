export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-alt text-ink-faint">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-ink">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
