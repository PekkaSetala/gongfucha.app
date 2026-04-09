"use client";

interface SecondaryPathsProps {
  onOpenGuide: () => void;
}

export function SecondaryPaths({ onOpenGuide }: SecondaryPathsProps) {
  return (
    <div className="px-5 pt-5 pb-2">
      <div className="border-t border-border pt-4">
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-border bg-surface text-left hover-lift w-full"
          style={{
            transition:
              "border-color 200ms var(--ease-out), transform 160ms var(--ease-out)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="var(--color-tertiary)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            aria-hidden="true"
          >
            {/* Open book silhouette */}
            <path d="M3 4.5C3 4.5 4.5 3.5 9 3.5C13.5 3.5 15 4.5 15 4.5V14.5C15 14.5 13.5 13.5 9 13.5C4.5 13.5 3 14.5 3 14.5V4.5Z" />
            <path d="M9 3.5V13.5" />
          </svg>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-medium text-primary">
              Tea guide
            </span>
            <span className="block text-[12px] text-tertiary mt-0.5">
              Origins, flavors, brewing
            </span>
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--color-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            aria-hidden="true"
          >
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
