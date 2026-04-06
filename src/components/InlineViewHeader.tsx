"use client";

interface InlineViewHeaderProps {
  onBack: () => void;
}

export function InlineViewHeader({ onBack }: InlineViewHeaderProps) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-3 mb-5 text-tertiary hover:text-primary"
      style={{ transition: "color 150ms var(--ease-out)" }}
    >
      <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4L6 9l5 5" />
        </svg>
      </span>
      <span className="text-lg font-medium">Back to tea list</span>
    </button>
  );
}
