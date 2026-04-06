"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { TimerRing } from "./TimerRing";
import { useTimer } from "@/hooks/useTimer";
import { nextExtendedTime } from "@/lib/brewing";

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

const PLAY_BTN_STYLE = {
  transition: "border-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
} as const;

const END_BTN_STYLE = {
  transition: "color 150ms var(--ease-out)",
} as const;

export function BrewingTimer({ params, onEnd }: BrewingTimerProps) {
  const [phase, setPhase] = useState<Phase>(params.rinse ? "rinse" : "brewing");
  const [infusionIndex, setInfusionIndex] = useState(0);
  const [schedule, setSchedule] = useState(params.schedule);
  const [nextAdjust, setNextAdjust] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const accentColor = params.teaColor || DEFAULT_COLOR;
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const audio = new Audio("/sounds/ceramic-tap.wav");
    audio.volume = 0.25;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const currentDuration =
    phase === "rinse" || phase === "rinse2"
      ? RINSE_DURATION
      : schedule[infusionIndex] ?? schedule[schedule.length - 1];

  const handleTimerComplete = useCallback(() => {
    playSound();
    if (phase === "rinse" && params.doubleRinse) {
      setPhase("rinse2");
    } else if (phase === "rinse" || phase === "rinse2") {
      setPhase("brewing");
    } else {
      setPhase("between");
    }
  }, [phase, params.doubleRinse, playSound]);

  const timer = useTimer({
    durationSeconds: currentDuration,
    onComplete: handleTimerComplete,
  });

  const [autoPlay, setAutoPlay] = useState(false);

  // Auto-play after state settles from handleBrewNext
  useEffect(() => {
    if (autoPlay && phase === "brewing") {
      timer.play();
      setAutoPlay(false);
    }
  }, [autoPlay, phase, timer]);

  // Spacebar play/pause (desktop convenience)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && phase !== "between" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (timer.isRunning) { timer.pause(); } else { timer.play(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, timer]);

  const handleBrewNext = () => {
    const nextIndex = infusionIndex + 1;
    const adjusted = adjustedNextTime();

    // Write the adjusted time into the schedule
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


  return (
    <div
      className="flex flex-col min-h-[100dvh] paper-texture"
      style={{
        "--tea-accent": accentColor,
        background: `linear-gradient(to bottom, var(--tea-accent-soft), transparent 40%), var(--color-bg)`,
      } as React.CSSProperties}
    >
      {/* ─── SR phase announcements ─── */}
      <div className="sr-only" aria-live="polite">{phaseLabel()}</div>

      {/* ─── Tea name — centered, prominent ─── */}
      <div className="pt-14 pb-1 text-center">
        <h1 ref={titleRef} tabIndex={-1} className="text-xl font-normal text-primary font-serif-cn outline-none">{params.teaName}</h1>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {phase !== "between" && (
          <div key={`timer-${phase}`} className="phase-enter flex flex-col items-center w-full -mt-6">
            {/* Phase label */}
            <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-4">
              {phaseLabel()}
            </p>
            {(phase === "rinse" || phase === "rinse2") && (
              <p className="text-sm text-tertiary italic -mt-2 mb-3">
                Pour, wait, discard
              </p>
            )}

            {/* Timer ring */}
            <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]" role="timer" aria-label={`${timer.secondsLeft} seconds remaining`}>
              <TimerRing
                progress={timer.progress}
                secondsLeft={timer.secondsLeft}
                color={accentColor}
              />
            </div>

            {/* Play / Pause */}
            <button
              onClick={timer.isRunning ? timer.pause : timer.play}
              className="mt-5 w-16 h-16 flex items-center justify-center rounded-full border border-border bg-surface text-primary"
              style={PLAY_BTN_STYLE}
              aria-label={timer.isRunning ? "Pause" : "Play"}
            >
              {timer.isRunning ? (
                <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="6" y1="4" x2="6" y2="14" />
                  <line x1="12" y1="4" x2="12" y2="14" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4l8 5-8 5V4z" />
                </svg>
              )}
            </button>

            {/* Session info */}
            <p className="text-sm text-secondary mt-5">
              {params.tempC}°C · {params.actualLeaf}g · {params.vesselMl}ml
            </p>
            <div className="flex gap-2 justify-center flex-wrap mt-3 max-w-[340px]">
              {schedule.map((s, i) => {
                const isCurrent = i === infusionIndex && phase === "brewing";
                const isDone = i < infusionIndex;

                return (
                  <span
                    key={i}
                    className={`text-sm font-medium ${
                      isDone
                        ? "text-tertiary line-through"
                        : !isCurrent
                          ? "text-secondary"
                          : ""
                    }`}
                    style={{
                      transition: "color 200ms var(--ease-out)",
                      ...(isCurrent
                        ? { color: accentColor, fontWeight: 600 }
                        : {}),
                    }}
                  >
                    {s}s
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {phase === "between" && (
          /* ─── Between infusions ─── */
          <div key="between" className="phase-enter flex flex-col items-center w-full max-w-[320px]">
            <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-3">
              {phaseLabel()}
            </p>

            <p className="text-[44px] font-normal text-primary mb-8">
              {adjustedNextTime()}s
            </p>

            {/* Next infusion adjuster */}
            <div className="w-full bg-surface border border-border rounded-[14px] px-5 py-4 mb-4">
              <p className="text-xs font-medium uppercase tracking-[1px] text-tertiary mb-3 text-center">
                Adjust time
              </p>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setNextAdjust((a) => a - 3)} className="w-11 h-11 rounded-xl border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center" aria-label="Decrease next infusion time by 3 seconds">
                  −3
                </button>
                <span className="text-xl font-medium min-w-[56px] text-center text-primary">
                  {adjustedNextTime()}s
                </span>
                <button onClick={() => setNextAdjust((a) => a + 3)} className="w-11 h-11 rounded-xl border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center" aria-label="Increase next infusion time by 3 seconds">
                  +3
                </button>
              </div>
            </div>

            <button
              onClick={handleBrewNext}
              className="w-full py-4 rounded-[14px] font-medium text-base"
              style={{
                backgroundColor: accentColor,
                color: "var(--color-surface)",
                transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
              }}
            >
              Brew Next
            </button>
          </div>
        )}
      </div>

      {/* ─── End session — bottom, subtle, proper tap target ─── */}
      <div className="pb-10 pt-3 flex justify-center">
        <button
          onClick={onEnd}
          className="text-sm text-tertiary min-h-[48px] px-5 py-2.5 flex items-center justify-center rounded-xl border border-border bg-surface hover-lift"
          style={END_BTN_STYLE}
        >
          End session
        </button>
      </div>
    </div>
  );
}
