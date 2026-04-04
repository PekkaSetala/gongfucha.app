"use client";

interface InlineViewHeaderProps {
  title: string;
  onBack: () => void;
}

export function InlineViewHeader({ title, onBack }: InlineViewHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-full flex items-center justify-center text-tertiary hover:text-primary"
        style={{ transition: "color 150ms var(--ease-out)" }}
        aria-label="Back to tea list"
      >
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
      </button>
      <h2 className="text-lg font-medium">{title}</h2>
    </div>
  );
}
