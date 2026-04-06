"use client";

interface InlineViewHeaderProps {
  title: string;
  onBack: () => void;
}

export function InlineViewHeader({ title, onBack }: InlineViewHeaderProps) {
  return (
    <div className="mb-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-tertiary hover:text-primary mb-3 min-h-[44px] -ml-2 pl-2 pr-3 rounded-lg"
        style={{ transition: "color 150ms var(--ease-out)" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4L6 9l5 5" />
        </svg>
        <span className="text-[13px]">Tea list</span>
      </button>
      <h2 className="text-[22px] font-light text-primary">
        {title}
      </h2>
    </div>
  );
}
