"use client";

import { useRef, useEffect, useId } from "react";

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
  const circleRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    if (circleRef.current) circleRef.current.style.opacity = "1";
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

  const filterId = useId();

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg viewBox={`0 0 ${s} ${s}`} className="absolute inset-0 -rotate-90 w-full h-full">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
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
        {/* Progress arc with glow */}
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
          filter={progress > 0 ? `url(#${filterId})` : undefined}
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
