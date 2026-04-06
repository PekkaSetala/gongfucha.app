"use client";

interface SecondaryPathsProps {
  onOpenAI: () => void;
  onOpenCustom: () => void;
}

export function SecondaryPaths({ onOpenAI, onOpenCustom }: SecondaryPathsProps) {
  return (
    <div className="px-5 pt-4 pb-2 flex flex-col gap-2">
      <button
        onClick={onOpenAI}
        className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-solid border-border bg-surface text-left hover-lift"
        style={{
          transition: "border-color 200ms var(--ease-out), transform 160ms var(--ease-out)",
        }}
      >
        <span className="w-9 h-9 rounded-full bg-bg border border-border flex items-center justify-center text-tertiary shrink-0" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="5.5" />
            <path d="M5.5 7h5M5.5 9h3" />
          </svg>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-medium text-primary">
            Ask AI
          </span>
          <span className="block text-[12px] text-tertiary mt-0.5">
            Describe your tea and get brew parameters
          </span>
        </span>
      </button>

      <button
        onClick={onOpenCustom}
        className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-solid border-border bg-surface text-left hover-lift"
        style={{
          transition: "border-color 200ms var(--ease-out), transform 160ms var(--ease-out)",
        }}
      >
        <span className="w-9 h-9 rounded-full bg-bg border border-border flex items-center justify-center text-tertiary shrink-0" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M3 5.5h10M3 10.5h10" />
            <circle cx="5.5" cy="5.5" r="1.5" fill="var(--color-bg)" />
            <circle cx="10.5" cy="10.5" r="1.5" fill="var(--color-bg)" />
          </svg>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-medium text-primary">
            Custom brew
          </span>
          <span className="block text-[12px] text-tertiary mt-0.5">
            Set your own parameters
          </span>
        </span>
      </button>
    </div>
  );
}
