"use client";

interface SecondaryPathsProps {
  onOpenCustom: () => void;
}

export function SecondaryPaths({ onOpenCustom }: SecondaryPathsProps) {
  return (
    <div className="px-5 pt-5 pb-2">
      <div className="border-t border-border pt-4">
        <button
          onClick={onOpenCustom}
          className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-border bg-surface text-left hover-lift w-full"
          style={{
            transition: "border-color 200ms var(--ease-out), transform 160ms var(--ease-out)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.6" strokeLinecap="round" className="shrink-0" aria-hidden="true">
            <path d="M3 6.5h12M3 11.5h12" />
            <circle cx="6.5" cy="6.5" r="1.5" fill="var(--color-bg)" />
            <circle cx="11.5" cy="11.5" r="1.5" fill="var(--color-bg)" />
          </svg>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-medium text-primary">
              Custom brew
            </span>
            <span className="block text-[12px] text-tertiary mt-0.5">
              Set your own parameters
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
