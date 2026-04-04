"use client";

interface TimerRingProps {
  progress: number;
  secondsLeft: number;
  size?: number;
  color?: string;
}

export function TimerRing({
  progress,
  secondsLeft,
  size,
  color = "#8C563E",
}: TimerRingProps) {
  // If no explicit size, fill container
  const s = size ?? 220;
  const strokeWidth = 5;
  const radius = (s - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display =
    minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `${seconds}`;

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg viewBox={`0 0 ${s} ${s}`} className="absolute inset-0 -rotate-90 w-full h-full">
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke="#E4DBCC"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="select-none text-primary tabular-nums text-[48px] sm:text-[56px] font-normal tracking-tight">
        {display}
      </span>
    </div>
  );
}
