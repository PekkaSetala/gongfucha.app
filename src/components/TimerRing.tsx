"use client";

interface TimerRingProps {
  progress: number;
  secondsLeft: number;
  size?: number;
  color?: string;
  completed?: boolean;
  /** Between-infusions mode: dashed ring, no progress, shows "s" suffix */
  dashed?: boolean;
}

export function TimerRing({
  progress,
  secondsLeft,
  size,
  color = "#8C563E",
  completed = false,
  dashed = false,
}: TimerRingProps) {
  const s = size ?? 210;
  const strokeWidth = 2.5;
  const glowWidth = 12;
  const radius = (s - glowWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display =
    minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `${seconds}`;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: s, height: s }}
    >
      <svg
        viewBox={`0 0 ${s} ${s}`}
        className="absolute inset-0 -rotate-90 w-full h-full"
      >
        {/* Track */}
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke={`color-mix(in srgb, ${color} 8%, var(--color-border))`}
          strokeWidth={strokeWidth}
          opacity="0.35"
        />

        {dashed ? (
          /* Dashed "waiting" ring */
          <circle
            cx={s / 2}
            cy={s / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="8 14"
            className="ring-idle-breathe"
          />
        ) : (
          <>
            {/* Glow layer — wider, subtle */}
            {progress > 0 && (
              <circle
                cx={s / 2}
                cy={s / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={glowWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={completed ? "ring-glow-complete" : ""}
                style={{
                  opacity: 0.06,
                  transition:
                    "stroke-dashoffset 300ms var(--ease-out)",
                }}
              />
            )}
            {/* Progress arc */}
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
              className={completed ? "ring-complete" : ""}
              style={{
                opacity: 0.75,
                transition:
                  "stroke-dashoffset 300ms var(--ease-out)",
              }}
            />
          </>
        )}
      </svg>

      {/* Timer number — serif, digit-settle animation on each tick */}
      <span
        key={secondsLeft}
        className="select-none text-primary tabular-nums font-serif-cn digit-settle"
        style={{
          fontSize: 52,
          fontWeight: 300,
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {display}
        {dashed && (
          <span
            className="font-serif-cn"
            style={{
              fontSize: 18,
              fontWeight: 300,
              opacity: 0.35,
              marginLeft: 1,
            }}
          >
            s
          </span>
        )}
      </span>
    </div>
  );
}
