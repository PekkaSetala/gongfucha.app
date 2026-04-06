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
  const sound = useBrewSound();
  const [completed, setCompleted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [prevPhase, setPrevPhase] = useState<Phase | null>(null);
  const [shownTipIds, setShownTipIds] = useState<string[]>([]);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [totalTime, setTotalTime] = useState(0);

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
    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(200);
    }
    sound.play();
    setCompleted(true);

    // Delay phase change for ring pulse animation
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
  }, [phase, params.doubleRinse, sound]);

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
        <div className="w-full max-w-[680px] mx-auto">
          {phase !== "between" && (
            <div
              key={`timer-${phase}`}
              className={`${transitioning && prevPhase !== "between" ? "phase-exit" : "phase-enter"} w-full`}
            >
              {/* Phase label — always above */}
              <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-4 text-center md:text-left">
                {phaseLabel()}
              </p>
              {(phase === "rinse" || phase === "rinse2") && (
                <p className="text-sm text-tertiary italic -mt-2 mb-3 text-center md:text-left max-w-[280px] md:max-w-none">
                  {params.rinseHint || "Pour, wait, discard"}
                </p>
              )}

              <div className="md:grid md:grid-cols-[1fr_280px] md:gap-8 md:items-start">
                {/* Left: Ring + play button */}
                <div className="flex flex-col items-center">
                  <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]" role="timer" aria-label={`${timer.secondsLeft} seconds remaining`}>
                    <TimerRing
                      progress={timer.progress}
                      secondsLeft={timer.secondsLeft}
                      color={accentColor}
                      completed={completed}
                    />
                  </div>

                  <button
                    onClick={() => {
                      sound.unlock();
                      timer.isRunning ? timer.pause() : timer.play();
                    }}
                    className={`mt-5 w-16 h-16 flex items-center justify-center rounded-full ${
                      timer.isRunning
                        ? "border border-border bg-surface text-primary"
                        : "text-surface shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                    }`}
                    style={{
                      ...PLAY_BTN_STYLE,
                      ...(!timer.isRunning ? { backgroundColor: accentColor } : {}),
                    }}
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
                </div>

                {/* Right: Session info (desktop) / below ring (mobile) */}
                <div className="mt-6 md:mt-0">
                  <div className="bg-surface/60 border border-border/50 rounded-xl px-5 py-3 w-full">
                    <p className="text-sm text-secondary text-center md:text-left mb-2">
                      {params.tempC}°C · {params.actualLeaf}g · {params.vesselMl}ml
                    </p>
                    <div className="flex gap-2 justify-center md:justify-start flex-wrap">
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
                              ...(isCurrent ? { color: accentColor, fontWeight: 600 } : {}),
                            }}
                          >
                            {s}s
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {params.brewNote && (
                    <p className="text-[13px] font-serif-cn italic text-tertiary mt-3 text-center md:text-left">
                      {params.brewNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === "between" && !transitioning && (
            <div key="between" className="phase-enter w-full">
              <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-3 text-center md:text-left">
                {phaseLabel()}
              </p>

              <div className="md:grid md:grid-cols-[1fr_280px] md:gap-8 md:items-start">
                {/* Left: Adjuster + Brew Next */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-5 mb-8">
                    <button onClick={() => setNextAdjust((a) => a - 3)} className="w-12 h-12 rounded-xl border border-border bg-surface text-secondary text-[14px] font-medium flex items-center justify-center" aria-label="Decrease next infusion time by 3 seconds">
                      −3
                    </button>
                    <span className="text-[44px] font-normal text-primary min-w-[80px] text-center tabular-nums">
                      {adjustedNextTime()}s
                    </span>
                    <button onClick={() => setNextAdjust((a) => a + 3)} className="w-12 h-12 rounded-xl border border-border bg-surface text-secondary text-[14px] font-medium flex items-center justify-center" aria-label="Increase next infusion time by 3 seconds">
                      +3
                    </button>
                  </div>

                  <button
                    onClick={handleBrewNext}
                    className="w-full max-w-[320px] py-4 rounded-[14px] font-medium text-base shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                    style={{
                      backgroundColor: accentColor,
                      color: "var(--color-surface)",
                      transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
                    }}
                  >
                    Brew Next
                  </button>
                </div>

                {/* Right: Schedule + context + tip */}
                <div className="mt-6 md:mt-0">
                  <div className="flex gap-2 justify-center md:justify-start flex-wrap mb-4">
                    {schedule.map((s, i) => {
                      const isDone = i <= infusionIndex;
                      const isNext = i === infusionIndex + 1;
                      return (
                        <span
                          key={i}
                          className={`text-sm font-medium ${
                            isDone ? "text-tertiary line-through" : isNext ? "" : "text-secondary"
                          }`}
                          style={isNext ? { color: accentColor, fontWeight: 600 } : undefined}
                        >
                          {i === infusionIndex + 1 ? `${adjustedNextTime()}s` : `${s}s`}
                        </span>
                      );
                    })}
                  </div>

                  <div className="bg-surface/60 border border-border/50 rounded-xl px-5 py-3 w-full">
                    <p className="text-sm text-secondary text-center md:text-left">
                      {params.tempC}°C · {formatRatio(params.actualLeaf, params.vesselMl)} · {params.vesselMl}ml
                    </p>
                    {params.brewNote && (
                      <p className="text-[13px] font-serif-cn italic text-tertiary text-center md:text-left mt-1.5">
                        {params.brewNote}
                      </p>
                    )}
                    {currentTip && (
                      <p className="text-[13px] italic text-secondary text-center md:text-left mt-2.5 pt-2.5 border-t border-border/50">
                        {currentTip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── End session — bottom, subtle, proper tap target ─── */}
      <div className="pb-10 pt-3 flex justify-center">
        <button
          onClick={() => {
            const finalTime = phase === "brewing" && timer.isRunning
              ? totalTime + (currentDuration - timer.secondsLeft)
              : totalTime;
            setTotalTime(finalTime);
            setShowSummary(true);
          }}
          className="text-sm text-tertiary min-h-[48px] px-5 py-2.5 flex items-center justify-center rounded-xl border border-border bg-surface hover-lift"
          style={END_BTN_STYLE}
        >
          End session
        </button>
      </div>
    </div>
  );
}
