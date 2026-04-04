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

export function BrewingTimer({ params, onEnd }: BrewingTimerProps) {
  const [phase, setPhase] = useState<Phase>(params.rinse ? "rinse" : "brewing");
  const [infusionIndex, setInfusionIndex] = useState(0);
  const [schedule, setSchedule] = useState(params.schedule);
  const [nextAdjust, setNextAdjust] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const accentColor = params.teaColor || DEFAULT_COLOR;

  useEffect(() => {
    audioRef.current = new Audio("/sounds/ceramic-tap.wav");
    audioRef.current.volume = 0.25;
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

  const handleBrewNext = () => {
    const nextIndex = infusionIndex + 1;
    if (nextIndex >= schedule.length) {
      const extended = nextExtendedTime(schedule[schedule.length - 1]);
      setSchedule((prev) => [...prev, extended]);
    }
    setInfusionIndex(nextIndex);
    setNextAdjust(0);
    setPhase("brewing");
    setTimeout(() => timer.play(), 50);
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

  const stepperBtn =
    "w-11 h-11 rounded-xl border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-bg">
      {/* ─── Top bar ─── */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-[15px] font-medium text-primary">
            {params.teaName}
          </span>
        </div>
        <button
          onClick={onEnd}
          className="text-[13px] font-medium text-tertiary"
          style={{ transition: "color 150ms var(--ease-out)" }}
        >
          End
        </button>
      </div>

      {/* ─── Phase label ─── */}
      <div className="text-center px-5 pt-4 pb-2">
        <p className="text-[12px] font-medium uppercase tracking-[1.5px] text-tertiary">
          {phaseLabel()}
        </p>
        {(phase === "rinse" || phase === "rinse2") && (
          <p className="text-[14px] text-secondary italic mt-1.5">
            Pour, wait, discard
          </p>
        )}
      </div>

      {/* ─── Main content — ring or between-infusion ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {phase !== "between" ? (
          <div className="flex flex-col items-center -mt-8">
            {/* Timer ring */}
            <div className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]">
              <TimerRing
                progress={timer.progress}
                secondsLeft={timer.secondsLeft}
                color={accentColor}
              />
            </div>

            {/* Play / Pause */}
            <button
              onClick={timer.isRunning ? timer.pause : timer.play}
              className="mt-10 w-14 h-14 flex items-center justify-center rounded-full border border-border bg-surface text-primary"
              style={{
                transition: "border-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
              }}
              aria-label={timer.isRunning ? "Pause" : "Play"}
            >
              {timer.isRunning ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <rect x="4" y="3" width="3.5" height="12" rx="1" />
                  <rect x="10.5" y="3" width="3.5" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M5 3l10 6-10 6V3z" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          /* ─── Between infusions ─── */
          <div className="flex flex-col items-center w-full max-w-[320px] -mt-8 detail-enter">
            {/* Completed time */}
            <p className="text-[48px] font-normal text-primary mb-10">
              {schedule[infusionIndex]}s
            </p>

            {/* Next infusion adjuster */}
            <div className="w-full bg-surface border border-border rounded-[14px] p-5 mb-5">
              <p className="text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-4 text-center">
                Next infusion
              </p>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setNextAdjust((a) => a - 3)} className={stepperBtn}>
                  −3
                </button>
                <span className="text-[22px] font-medium min-w-[60px] text-center text-primary">
                  {adjustedNextTime()}s
                </span>
                <button onClick={() => setNextAdjust((a) => a + 3)} className={stepperBtn}>
                  +3
                </button>
              </div>
            </div>

            {/* Brew Next */}
            <button
              onClick={handleBrewNext}
              className="w-full py-4 rounded-[14px] font-medium text-[15px]"
              style={{
                backgroundColor: accentColor,
                color: "#FAF7F2",
                transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
              }}
            >
              Brew Next
            </button>
          </div>
        )}
      </div>

      {/* ─── Bottom: params + schedule pills ─── */}
      <div className="px-5 pb-8 pt-6">
        <p className="text-[12px] text-tertiary text-center mb-3">
          {params.tempC}°C · {params.actualLeaf}g · {params.vesselMl}ml
        </p>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {schedule.map((s, i) => {
            const isCurrent = i === infusionIndex && phase === "brewing";
            const isDone = i < infusionIndex || (i === infusionIndex && phase === "between");

            return (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium border ${
                  isDone
                    ? "bg-bg border-border text-tertiary line-through"
                    : !isCurrent
                      ? "bg-bg border-border text-secondary"
                      : ""
                }`}
                style={{
                  transition: "background-color 200ms var(--ease-out), color 200ms var(--ease-out)",
                  ...(isCurrent
                    ? {
                        backgroundColor: `${accentColor}0D`,
                        borderColor: `${accentColor}26`,
                        color: accentColor,
                      }
                    : {}),
                }}
              >
                {s}s
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
