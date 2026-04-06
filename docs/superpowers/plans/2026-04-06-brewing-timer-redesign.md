# Brewing Timer Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the brewing timer to feel like a seamless, meditative extension of the main page — with a color wash, serif numbers, tea color bridge transition, and spatial continuity between phases.

**Architecture:** Four files change in sequence: CSS keyframes first (no runtime risk), then TimerRing (new props, backward-compatible), then BrewingTimer (full layout rewrite using new TimerRing), then page.tsx (transition wrapper). Each task produces a working app.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, CSS keyframes + custom properties, SVG

**Spec:** `docs/superpowers/specs/2026-04-06-brewing-timer-redesign-design.md`

---

### Task 1: Add New CSS Keyframes and Animation Classes

**Files:**
- Modify: `src/app/globals.css`

All new animations added here. No runtime changes — pure CSS additions.

- [ ] **Step 1: Add wash-breathe, wash-flash, digit-settle, wisp, ring-idle-breathe, between-enter keyframes**

Add the following block after the existing `.phase-exit` animation (after line 218) and before the `@media (prefers-reduced-motion)` block:

```css
/* ─── Color wash breathing ─── */
@keyframes wash-breathe {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.wash-breathe {
  animation: wash-breathe 8s ease-in-out infinite;
}

/* ─── Wash flash on completion ─── */
@keyframes wash-flash {
  0% { opacity: 0; }
  12% { opacity: 1; }
  100% { opacity: 0; }
}

.wash-flash {
  animation: wash-flash 1.2s ease-out forwards;
}

/* ─── Digit vertical settle ─── */
@keyframes digit-settle {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.digit-settle {
  animation: digit-settle 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ─── Steam wisp drift ─── */
@keyframes wisp-rise {
  0% {
    transform: translateY(0) scaleX(1);
    opacity: 0;
  }
  15% {
    opacity: 0.45;
  }
  50% {
    transform: translateY(-60px) scaleX(1.3);
    opacity: 0.25;
  }
  100% {
    transform: translateY(-130px) scaleX(0.5);
    opacity: 0;
  }
}

/* ─── Ring idle breathe (between state) ─── */
@keyframes ring-idle-breathe {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.3; }
}

.ring-idle-breathe {
  animation: ring-idle-breathe 4s ease-in-out infinite;
}

/* ─── Between-phase enter (fade only, no translateY) ─── */
@keyframes between-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}

.between-enter {
  animation: between-enter 350ms var(--ease-out) forwards;
}

/* ─── View transition (tea color bridge) ─── */
@keyframes view-fade-out {
  from { opacity: 1; filter: blur(0); }
  to { opacity: 0; filter: blur(4px); }
}

@keyframes view-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bridge-in {
  0% { opacity: 0; }
  40% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}

.view-fade-out {
  animation: view-fade-out 250ms var(--ease-out) forwards;
}

.view-fade-in {
  animation: view-fade-in 300ms var(--ease-out) forwards;
}

.bridge-overlay {
  animation: bridge-in 600ms var(--ease-out) forwards;
}
```

- [ ] **Step 2: Update the reduced-motion block**

Replace the existing `@media (prefers-reduced-motion: reduce)` block (lines 221–229) with:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .wash-breathe,
  .ring-idle-breathe {
    animation: none !important;
  }

  .view-fade-out {
    animation: none !important;
    opacity: 0;
  }

  .view-fade-in {
    animation: none !important;
    opacity: 1;
  }

  .bridge-overlay {
    display: none !important;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add keyframes for wash, digit, wisp, bridge animations"
```

---

### Task 2: Redesign TimerRing Component

**Files:**
- Modify: `src/components/TimerRing.tsx`

Add glow stroke layer, dashed "between" mode, serif font, and digit re-mount animation.

- [ ] **Step 1: Rewrite TimerRing.tsx**

Replace the entire contents of `src/components/TimerRing.tsx` with:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. The existing BrewingTimer still uses `TimerRing` with the same original props — the new `dashed` prop defaults to `false`, so nothing breaks.

- [ ] **Step 3: Commit**

```bash
git add src/components/TimerRing.tsx
git commit -m "feat: redesign TimerRing — serif digits, glow stroke, dashed mode"
```

---

### Task 3: Rewrite BrewingTimer Layout

**Files:**
- Modify: `src/components/BrewingTimer.tsx`

Complete layout rewrite: single centered column, new info card with pills, wash + wisps, between state with ring persistence. All logic (timer, phase state machine, schedule adjustment) stays identical.

- [ ] **Step 1: Rewrite BrewingTimer.tsx**

Replace the entire contents of `src/components/BrewingTimer.tsx` with:

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { TimerRing } from "./TimerRing";
import { useTimer } from "@/hooks/useTimer";
import { nextExtendedTime, formatRatio } from "@/lib/brewing";
import { useBrewSound } from "@/hooks/useBrewSound";
import { brewTips } from "@/data/brew-tips";
import { selectTip } from "@/lib/brew-tips";
import { SessionSummary } from "./SessionSummary";

export interface BrewParams {
  teaId: string;
  teaName: string;
  teaColor?: string;
  tempC: number;
  vesselMl: number;
  recommendedLeaf: number;
  actualLeaf: number;
  rinse: boolean;
  doubleRinse: boolean;
  rinseHint?: string;
  schedule: number[];
  scheduleAdjusted: boolean;
  brewNote: string;
}

interface BrewingTimerProps {
  params: BrewParams;
  onEnd: () => void;
}

type Phase = "rinse" | "rinse2" | "brewing" | "between";

const RINSE_DURATION = 5;
const DEFAULT_COLOR = "#8C563E";

export function BrewingTimer({ params, onEnd }: BrewingTimerProps) {
  const [phase, setPhase] = useState<Phase>(params.rinse ? "rinse" : "brewing");
  const [infusionIndex, setInfusionIndex] = useState(0);
  const [schedule, setSchedule] = useState(params.schedule);
  const [nextAdjust, setNextAdjust] = useState(0);
  const sound = useBrewSound();
  const [completed, setCompleted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [prevPhase, setPrevPhase] = useState<Phase | null>(null);
  const [shownTipIds, setShownTipIds] = useState<string[]>([]);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [washFlash, setWashFlash] = useState(false);

  const accentColor = params.teaColor || DEFAULT_COLOR;
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (phase === "between") {
      const tip = selectTip(brewTips, params.teaId, infusionIndex + 1, shownTipIds);
      if (tip) {
        setCurrentTip(tip.text);
        setShownTipIds((prev) => [...prev, tip.id]);
      } else {
        setCurrentTip(null);
      }
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentDuration =
    phase === "rinse" || phase === "rinse2"
      ? RINSE_DURATION
      : schedule[infusionIndex] ?? schedule[schedule.length - 1];

  const handleTimerComplete = useCallback(() => {
    if (phase === "brewing") {
      setTotalTime((prev) => prev + currentDuration);
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(200);
    }
    sound.play();
    setCompleted(true);
    setWashFlash(true);
    setTimeout(() => setWashFlash(false), 1200);

    setTimeout(() => {
      setCompleted(false);
      const nextPhase: Phase =
        phase === "rinse" && params.doubleRinse
          ? "rinse2"
          : phase === "rinse" || phase === "rinse2"
            ? "brewing"
            : "between";

      setPrevPhase(phase);
      setTransitioning(true);

      setTimeout(() => {
        setPhase(nextPhase);
        setTransitioning(false);
        setPrevPhase(null);
      }, 200);
    }, 400);
  }, [phase, params.doubleRinse, sound, currentDuration]);

  const timer = useTimer({
    durationSeconds: currentDuration,
    onComplete: handleTimerComplete,
  });

  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (autoPlay && phase === "brewing") {
      timer.play();
      setAutoPlay(false);
    }
  }, [autoPlay, phase, timer]);

  // Spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        phase !== "between" &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)
      ) {
        e.preventDefault();
        if (timer.isRunning) {
          timer.pause();
        } else {
          timer.play();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, timer]);

  const handleBrewNext = () => {
    const nextIndex = infusionIndex + 1;
    const adjusted = adjustedNextTime();

    setSchedule((prev) => {
      const next = [...prev];
      if (nextIndex < next.length) {
        next[nextIndex] = adjusted;
      } else {
        next.push(adjusted);
      }
      return next;
    });

    setInfusionIndex(nextIndex);
    setNextAdjust(0);
    setPhase("brewing");
    setAutoPlay(true);
  };

  const adjustedNextTime = () => {
    const baseTime =
      infusionIndex + 1 < schedule.length
        ? schedule[infusionIndex + 1]
        : nextExtendedTime(schedule[schedule.length - 1]);
    return Math.max(1, baseTime + nextAdjust);
  };

  const phaseLabel = () => {
    if (phase === "rinse") return "Rinse";
    if (phase === "rinse2") return "Rinse 2";
    if (phase === "between") return `Infusion ${infusionIndex + 1} complete`;
    return `Infusion ${infusionIndex + 1}`;
  };

  if (showSummary) {
    return (
      <SessionSummary
        teaName={params.teaName}
        teaColor={accentColor}
        infusionsCompleted={phase === "between" ? infusionIndex + 1 : Math.max(infusionIndex, 0)}
        totalTimeSeconds={totalTime}
        leafG={params.actualLeaf}
        vesselMl={params.vesselMl}
        onDone={onEnd}
      />
    );
  }

  const isBetween = phase === "between" && !transitioning;
  const isBrewing = phase !== "between";

  return (
    <div
      className="flex flex-col min-h-[100dvh] paper-texture"
      style={{
        "--tea-accent": accentColor,
      } as React.CSSProperties}
    >
      {/* ─── Color wash ─── */}
      <div
        className={`fixed inset-0 pointer-events-none ${isBrewing && timer.isRunning ? "wash-breathe" : ""}`}
        style={{
          background: `radial-gradient(
            ellipse 90% 55% at 50% 30%,
            color-mix(in srgb, ${accentColor} 14%, transparent),
            color-mix(in srgb, ${accentColor} 5%, transparent) 55%,
            transparent 100%
          )`,
          opacity: isBetween ? 0.55 : undefined,
          transition: "opacity 600ms var(--ease-in-out)",
          zIndex: 0,
        }}
      />

      {/* ─── Wash flash on completion ─── */}
      {washFlash && (
        <div
          className="fixed inset-0 pointer-events-none wash-flash"
          style={{
            background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${accentColor} 20%, transparent), transparent 70%)`,
            zIndex: 0,
          }}
        />
      )}

      {/* ─── Steam wisps (between only) ─── */}
      {isBetween && (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="fixed pointer-events-none"
              style={{
                bottom: "38%",
                left: `${36 + i * 11}%`,
                width: 50,
                height: 100,
                background: `radial-gradient(ellipse at 50% 80%, color-mix(in srgb, ${accentColor} 6%, transparent), transparent 70%)`,
                borderRadius: "50%",
                animation: `wisp-rise ${6 + i * 1.25}s ease-in-out ${i * 2}s infinite`,
                zIndex: 0,
              }}
            />
          ))}
        </>
      )}

      {/* ─── SR phase announcements ─── */}
      <div className="sr-only" aria-live="polite">{phaseLabel()}</div>

      {/* ─── Content ─── */}
      <div className="relative z-[1] flex-1 flex flex-col items-center px-5">
        <div className="w-full max-w-[680px] mx-auto flex flex-col items-center flex-1">

          {/* Tea name */}
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="text-xl font-normal font-serif-cn outline-none pt-12"
            style={{ color: accentColor }}
          >
            {params.teaName}
          </h1>

          {/* Phase label */}
          <p
            className="text-[11px] font-medium uppercase tracking-[1.5px] mt-1.5"
            style={{ color: `color-mix(in srgb, ${accentColor} 50%, var(--color-secondary))` }}
          >
            {phaseLabel()}
          </p>

          {/* Rinse hint */}
          {(phase === "rinse" || phase === "rinse2") && (
            <p className="text-[13px] font-serif-cn italic text-secondary mt-1">
              {params.rinseHint || "Pour, wait, discard"}
            </p>
          )}

          {/* ─── Timer area ─── */}
          {isBrewing && !transitioning && (
            <div
              key={`timer-${phase}`}
              className={`flex flex-col items-center mt-6 ${transitioning && prevPhase !== "between" ? "phase-exit" : "phase-enter"}`}
            >
              <div role="timer" aria-label={`${timer.secondsLeft} seconds remaining`}>
                <TimerRing
                  progress={timer.progress}
                  secondsLeft={timer.secondsLeft}
                  color={accentColor}
                  completed={completed}
                />
              </div>

              {/* Play / Pause */}
              <button
                onClick={() => {
                  sound.unlock();
                  timer.isRunning ? timer.pause() : timer.play();
                }}
                className={`mt-4 w-14 h-14 flex items-center justify-center rounded-full ${
                  timer.isRunning
                    ? "border border-border bg-surface text-secondary"
                    : "text-surface"
                }`}
                style={{
                  transition: "transform 160ms var(--ease-out)",
                  ...(!timer.isRunning
                    ? {
                        backgroundColor: accentColor,
                        boxShadow: `0 2px 8px color-mix(in srgb, ${accentColor} 25%, rgba(0,0,0,0.1))`,
                      }
                    : {}),
                }}
                aria-label={timer.isRunning ? "Pause" : "Play"}
              >
                {timer.isRunning ? (
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="6" y1="4" x2="6" y2="14" />
                    <line x1="12" y1="4" x2="12" y2="14" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4l8 5-8 5V4z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* ─── Between state ─── */}
          {isBetween && (
            <div key="between" className="flex flex-col items-center mt-6 between-enter">
              {/* Ring in dashed mode */}
              <TimerRing
                progress={0}
                secondsLeft={adjustedNextTime()}
                color={accentColor}
                dashed
              />

              {/* ±3 adjusters */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setNextAdjust((a) => a - 3)}
                  className="w-11 h-11 rounded-xl border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center"
                  aria-label="Decrease next infusion time by 3 seconds"
                >
                  −3
                </button>
                <button
                  onClick={() => setNextAdjust((a) => a + 3)}
                  className="w-11 h-11 rounded-xl border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center"
                  aria-label="Increase next infusion time by 3 seconds"
                >
                  +3
                </button>
              </div>

              {/* Brew Next */}
              <button
                onClick={handleBrewNext}
                className="w-full max-w-[320px] py-4 rounded-[14px] font-medium text-[15px] mt-4"
                style={{
                  backgroundColor: accentColor,
                  color: "var(--color-surface)",
                  boxShadow: `0 2px 8px color-mix(in srgb, ${accentColor} 25%, rgba(0,0,0,0.1))`,
                  transition: "transform 160ms var(--ease-out)",
                }}
              >
                Brew Next
              </button>
            </div>
          )}

          {/* ─── Info card ─── */}
          <div
            className="w-full max-w-[320px] bg-surface/60 border border-border/50 rounded-[14px] px-5 py-3.5 mt-7"
          >
            {/* Schedule label + pills */}
            <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
              Schedule
            </span>
            <div className="flex flex-wrap gap-1.5">
              {schedule.map((s, i) => {
                const isCurrent = isBetween
                  ? i === infusionIndex + 1
                  : i === infusionIndex && phase === "brewing";
                const isDone = isBetween ? i <= infusionIndex : i < infusionIndex;
                const displayTime = isBetween && i === infusionIndex + 1 ? adjustedNextTime() : s;

                return (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-md text-[12px] font-medium border ${
                      isDone
                        ? "bg-transparent border-border text-tertiary opacity-40 line-through decoration-1"
                        : isCurrent
                          ? "font-semibold"
                          : "bg-bg border-border text-secondary opacity-70"
                    }`}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                            borderColor: `color-mix(in srgb, ${accentColor} 25%, var(--color-border))`,
                            color: accentColor,
                          }
                        : undefined
                    }
                  >
                    {displayTime}s
                  </span>
                );
              })}
            </div>

            {/* Param row */}
            <div
              className="flex gap-5 mt-3 pt-2.5"
              style={{ borderTop: `1px solid color-mix(in srgb, ${accentColor} 6%, var(--color-border))` }}
            >
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Temp</span>
                <span className="text-[14px] font-medium text-secondary">{params.tempC}°C</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Ratio</span>
                <span className="text-[14px] font-medium text-secondary">{formatRatio(params.actualLeaf, params.vesselMl)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Vessel</span>
                <span className="text-[14px] font-medium text-secondary">{params.vesselMl}ml</span>
              </div>
            </div>

            {/* Brew note (brewing) or tip (between) */}
            {phase !== "between" && params.brewNote && (
              <p
                className="text-[13px] font-serif-cn italic leading-relaxed mt-2.5 pt-2.5"
                style={{
                  borderTop: `1px solid color-mix(in srgb, ${accentColor} 6%, var(--color-border))`,
                  color: `color-mix(in srgb, ${accentColor} 25%, var(--color-secondary))`,
                }}
              >
                {params.brewNote}
              </p>
            )}
            {isBetween && currentTip && (
              <p
                className="text-[13px] font-serif-cn italic leading-relaxed mt-2.5 pt-2.5"
                style={{
                  borderTop: `1px solid color-mix(in srgb, ${accentColor} 6%, var(--color-border))`,
                  color: `color-mix(in srgb, ${accentColor} 25%, var(--color-secondary))`,
                }}
              >
                {currentTip}
              </p>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* End session */}
          <div className="pb-7 pt-3 flex justify-center">
            <button
              onClick={() => {
                const finalTime =
                  phase === "brewing" && timer.isRunning
                    ? totalTime + (currentDuration - timer.secondsLeft)
                    : totalTime;
                setTotalTime(finalTime);
                setShowSummary(true);
              }}
              className="text-sm min-h-[48px] px-5 py-2.5 flex items-center justify-center rounded-xl bg-surface hover-lift"
              style={{
                transition: "color 150ms var(--ease-out)",
                color: `color-mix(in srgb, ${accentColor} 30%, var(--color-tertiary))`,
                border: `1px solid color-mix(in srgb, ${accentColor} 12%, var(--color-border))`,
              }}
            >
              End session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify dev server**

Run: `npm run dev`
Manual test: Select a tea, start brewing. Verify:
- Serif numbers in the ring
- Color wash breathing behind everything
- Phase label in small uppercase
- Info card with pills below the ring
- Between state shows dashed ring, adjusters below, Brew Next button
- Steam wisps visible in between state
- Wash flash on infusion completion

- [ ] **Step 4: Commit**

```bash
git add src/components/BrewingTimer.tsx
git commit -m "feat: rewrite BrewingTimer — centered column, wash, pills, serif digits"
```

---

### Task 4: Add View Transition (Tea Color Bridge)

**Files:**
- Modify: `src/app/page.tsx`

Replace the hard conditional swap with a transition wrapper. Both views mount; opacity and pointer-events control visibility.

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { getTeas, getTeaById } from "@/data/teas";
import { Header } from "@/components/Header";
import { TeaList } from "@/components/TeaList";
import { BrewingTimer } from "@/components/BrewingTimer";
import type { AIResult } from "@/components/AIAdvisor";
import type { BrewParams } from "@/components/BrewingTimer";
import { getTeaColor } from "@/data/tea-categories";

const VESSEL_KEY = "gongfucha-vessel-ml";
const DEFAULT_VESSEL = 120;

function getStoredVessel(): number {
  if (typeof window === "undefined") return DEFAULT_VESSEL;
  const stored = localStorage.getItem(VESSEL_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_VESSEL;
}

type ViewState = "list" | "enter-brewing" | "brewing" | "exit-brewing";

export default function Home() {
  const teas = getTeas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [vesselMl, setVesselMl] = useState(DEFAULT_VESSEL);
  const [brewParams, setBrewParams] = useState<BrewParams | null>(null);
  const [viewState, setViewState] = useState<ViewState>("list");
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVesselMl(getStoredVessel());
  }, []);

  useEffect(() => {
    if (brewParams) {
      document.title = `Brewing ${brewParams.teaName} — Gongfu Cha`;
    } else {
      document.title = "Gongfu Cha";
    }
  }, [brewParams]);

  const handleVesselChange = (ml: number) => {
    setVesselMl(ml);
    localStorage.setItem(VESSEL_KEY, String(ml));
  };

  const handleSelect = (id: string) => {
    setSelectedId(selectedId === id ? null : id);
    setAiExpanded(false);
    setCustomExpanded(false);
  };

  const handleToggleAI = () => {
    setAiExpanded(!aiExpanded);
    setSelectedId(null);
    setCustomExpanded(false);
  };

  const handleToggleCustom = () => {
    setCustomExpanded(!customExpanded);
    setSelectedId(null);
    setAiExpanded(false);
  };

  const handleStartBrewing = (params: BrewParams) => {
    setBrewParams(params);
    setViewState("enter-brewing");

    // Phase 1: list fades out (250ms)
    // Phase 2: bridge overlay shows + brewing fades in (300ms)
    setTimeout(() => {
      setViewState("brewing");
    }, 600);
  };

  const handleAIBrew = (
    result: AIResult,
    aiVesselMl: number,
    leafG: number,
    schedule: number[],
    adjusted: boolean
  ) => {
    const recommendedLeaf =
      Math.round(result.ratioGPerMl * aiVesselMl * 10) / 10;
    const teaId = result.categoryId || "custom";
    handleStartBrewing({
      teaId,
      teaName: result.teaName,
      teaColor: getTeaColor(teaId),
      tempC: result.tempC,
      vesselMl: aiVesselMl,
      recommendedLeaf,
      actualLeaf: leafG,
      rinse: result.rinse,
      doubleRinse: result.doubleRinse,
      schedule,
      scheduleAdjusted: adjusted,
      brewNote: result.summary,
    });
  };

  const handleEndBrewing = () => {
    setViewState("exit-brewing");
    setTimeout(() => {
      setBrewParams(null);
      setViewState("list");
    }, 500);
  };

  const bridgeColor = brewParams?.teaColor || "#8C563E";
  const showList = viewState === "list" || viewState === "enter-brewing" || viewState === "exit-brewing";
  const showBrewing = viewState === "enter-brewing" || viewState === "brewing" || viewState === "exit-brewing";

  const selectedTea = selectedId ? getTeaById(selectedId) ?? null : null;

  return (
    <div className="relative min-h-[100dvh]">
      {/* ─── Bridge overlay ─── */}
      {(viewState === "enter-brewing" || viewState === "exit-brewing") && (
        <div
          className="fixed inset-0 pointer-events-none bridge-overlay"
          style={{
            background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${bridgeColor} 25%, transparent), transparent 70%)`,
            zIndex: 50,
          }}
        />
      )}

      {/* ─── Main list view ─── */}
      <div
        className={`${
          viewState === "enter-brewing"
            ? "view-fade-out"
            : viewState === "exit-brewing"
              ? "view-fade-in"
              : viewState === "brewing"
                ? "opacity-0 pointer-events-none"
                : ""
        }`}
        style={{
          position: viewState === "brewing" ? "absolute" : undefined,
          inset: viewState === "brewing" ? 0 : undefined,
        }}
      >
        <main id="main-content" className="flex-1">
          <div className="max-w-[680px] mx-auto min-h-screen">
            <Header />
            <div className="max-w-[680px] mx-auto">
              <TeaList
                teas={teas}
                selectedId={selectedId}
                onSelect={handleSelect}
                selectedTea={selectedTea}
                aiExpanded={aiExpanded}
                onToggleAI={handleToggleAI}
                customExpanded={customExpanded}
                onToggleCustom={handleToggleCustom}
                vesselMl={vesselMl}
                onVesselChange={handleVesselChange}
                onStartBrewing={handleStartBrewing}
                onAIBrew={handleAIBrew}
              />
            </div>
            <div className="h-16" />
          </div>
        </main>
      </div>

      {/* ─── Brewing view ─── */}
      {showBrewing && brewParams && (
        <div
          ref={timerRef}
          className={`${
            viewState === "enter-brewing"
              ? "view-fade-in"
              : viewState === "exit-brewing"
                ? "view-fade-out"
                : ""
          }`}
          style={{
            position: viewState !== "brewing" ? "absolute" : undefined,
            inset: viewState !== "brewing" ? 0 : undefined,
            zIndex: viewState !== "brewing" ? 40 : undefined,
          }}
        >
          <BrewingTimer params={brewParams} onEnd={handleEndBrewing} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify transition**

Run: `npm run dev`
Manual test:
- Select a tea and click "Start Brewing"
- Verify: list fades out with blur, tea color washes in as a radial overlay, brewing screen fades in
- Click "End session" → "Done" on summary
- Verify: brewing fades out, color bridge, list fades back in
- Test with different tea colors (green vs oolong vs puerh)

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: tea color bridge transition between list and brewing views"
```

---

### Task 5: Run Tests and Final Verification

**Files:**
- No code changes

- [ ] **Step 1: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass. The tests cover `brewing.ts` pure functions and `brew-tips.ts` — none test components directly, so the layout rewrite should not break them.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings related to our changes.

- [ ] **Step 4: Full manual QA**

Run: `npm run dev`

Test matrix:
1. **Green tea (Long Jing)**: Select → Start Brewing → verify green wash, serif "12" in ring, schedule pills, info card → let it complete → verify wash flash + sound → between state: dashed ring, wisps, ±3, Brew Next → start next infusion → End session → verify summary → Done → verify returns to list
2. **Oolong (Da Hong Pao)**: Same flow, verify amber color throughout
3. **Custom tea**: Custom mode → Start Brewing → verify default color (#8C563E)
4. **Rinse flow**: Select a tea with rinse → verify rinse phase shows hint text, then transitions to brewing
5. **Spacebar**: During brewing, press space to pause/resume
6. **Mobile viewport**: Resize to 375px width, verify single column layout, no overflow
7. **Reduced motion**: Enable in OS settings → verify no breathing/wisps/blur, just simple fades

- [ ] **Step 5: Commit if any fixes were needed**

Only if manual QA revealed issues that were fixed:

```bash
git add -A
git commit -m "fix: post-QA polish for brewing timer redesign"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-06-brewing-timer-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
