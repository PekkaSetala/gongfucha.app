"use client";

import { useRef, useEffect } from "react";

interface TimerRingProps {
  progress: number;
  secondsLeft: number;
  size?: number;
  color?: string;
  completed?: boolean;
}

export function TimerRing({
  progress,
  secondsLeft,
  size,
  color = "#8C563E",
  completed = false,
}: TimerRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    if (circleRef.current) circleRef.current.style.opacity = "1";
    if (glowRef.current) glowRef.current.style.opacity = "0.12";
  }, []);

  const s = size ?? 240;
  const strokeWidth = 7;
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
        {/* Track */}
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          opacity="0.5"
        />
        {/* Glow layer — thicker, semi-transparent, no filter */}
        {progress > 0 && (
          <circle
            ref={glowRef}
            cx={s / 2}
            cy={s / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={completed ? "ring-glow-complete" : ""}
            style={{
              opacity: 0,
              transition: "stroke-dashoffset 300ms var(--ease-out), opacity 600ms var(--ease-out)",
            }}
          />
        )}
        {/* Progress arc */}
        <circle
          ref={circleRef}
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
            opacity: 0,
            transition: "stroke-dashoffset 300ms var(--ease-out), opacity 600ms var(--ease-out)",
          }}
        />
      </svg>
      <span className="select-none text-primary tabular-nums text-[56px] sm:text-[64px] font-light tracking-tight digit-enter">
        {display}
      </span>
    </div>
  );
}
