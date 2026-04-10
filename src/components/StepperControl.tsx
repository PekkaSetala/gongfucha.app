"use client";

interface StepperControlProps {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementLabel: string;
  incrementLabel: string;
  decrementText?: string;
  incrementText?: string;
  suffix?: React.ReactNode;
}

const stepperBtnClass =
  "w-11 h-11 rounded-xl border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center disabled:opacity-30";

export function StepperControl({
  label,
  value,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  decrementLabel,
  incrementLabel,
  decrementText = "−",
  incrementText = "+",
  suffix,
}: StepperControlProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
        {label}
        {suffix}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onDecrement}
          className={stepperBtnClass}
          aria-label={decrementLabel}
          disabled={decrementDisabled}
        >
          {decrementText}
        </button>
        <span className="text-[16px] font-medium min-w-[48px] text-center">
          {value}
        </span>
        <button
          onClick={onIncrement}
          className={stepperBtnClass}
          aria-label={incrementLabel}
          disabled={incrementDisabled}
        >
          {incrementText}
        </button>
      </div>
    </div>
  );
}
