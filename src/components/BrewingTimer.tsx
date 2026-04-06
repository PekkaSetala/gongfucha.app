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
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
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
      className="flex flex-col h-[100dvh] overflow-y-auto paper-texture"
      style={{
        "--tea-accent": accentColor,
      } as React.CSSProperties}
    >
      {/* ─── Color wash — intensity deepens with steep progress ─── */}
      <div
        className={`fixed inset-0 pointer-events-none ${isBrewing && timer.isRunning ? "wash-breathe" : ""}`}
        style={{
          background: (() => {
            // Ease-out curve: rises quickly early, plateaus late
            const raw = isBrewing ? timer.progress : 0;
            const p = 1 - (1 - raw) * (1 - raw); // quadratic ease-out
            const centerPct = Math.round(8 + p * 10);  // 8% → 18%
            const midPct = Math.round(4 + p * 4);      // 4% → 8%
            return `radial-gradient(
              ellipse 90% 55% at 50% 30%,
              color-mix(in srgb, ${accentColor} ${centerPct}%, transparent),
              color-mix(in srgb, ${accentColor} ${midPct}%, transparent) 55%,
              transparent 100%
            )`;
          })(),
          opacity: isBetween ? 0.55 : 0.65 + (isBrewing ? timer.progress * 0.35 : 0),
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
            <p className="text-[13px] font-serif-cn italic text-secondary mt-1 text-center max-w-[280px]">
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
                  if (timer.isRunning) { timer.pause(); } else { timer.play(); }
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
