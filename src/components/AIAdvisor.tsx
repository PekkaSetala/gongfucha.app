"use client";

import { useState } from "react";
import { StepperControl } from "./StepperControl";
import {
  calculateLeafAmount,
  actualRatio,
  adjustSchedule,
  isScheduleAdjusted,
  formatRatio,
} from "@/lib/brewing";

interface AIResult {
  teaName: string;
  summary: string;
  tempC: number;
  ratioGPerMl: number;
  rinse: boolean;
  doubleRinse: boolean;
  schedule: number[];
  categoryId: string;
}

interface AIAdvisorProps {
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (
    result: AIResult,
    vesselMl: number,
    leafG: number,
    schedule: number[],
    scheduleAdjusted: boolean
  ) => void;
}

export type { AIResult };

export function AIAdvisor({
  vesselMl,
  onVesselChange,
  onStartBrewing,
}: AIAdvisorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [leafOverride, setLeafOverride] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLeafOverride(null);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error("Failed to identify tea");

      const data: AIResult = await res.json();
      setResult(data);
    } catch {
      setError(
        "Couldn't identify that tea. Try a different description, or use Custom Mode instead."
      );
    } finally {
      setLoading(false);
    }
  };

  // Derived values when result exists
  const recommendedLeaf = result
    ? calculateLeafAmount(result.ratioGPerMl, vesselMl)
    : 0;
  const currentLeaf = leafOverride ?? recommendedLeaf;
  const currentRatio = result ? actualRatio(currentLeaf, vesselMl) : 0;
  const scheduleAdjusted = result
    ? isScheduleAdjusted(result.ratioGPerMl, currentRatio)
    : false;
  const displaySchedule =
    result && scheduleAdjusted
      ? adjustSchedule(result.schedule, result.ratioGPerMl, currentRatio)
      : result?.schedule ?? [];

  const handleVesselChange = (delta: number) => {
    const clamped = Math.max(40, Math.min(300, vesselMl + delta));
    onVesselChange(clamped);
    setLeafOverride(null);
  };

  const handleLeafChange = (delta: number) => {
    const current = leafOverride ?? recommendedLeaf;
    const clamped = Math.max(0.5, Math.min(30, current + delta));
    setLeafOverride(Math.round(clamped * 10) / 10);
  };

  const handleStartBrewing = () => {
    if (!result) return;
    onStartBrewing(result, vesselMl, currentLeaf, displaySchedule, scheduleAdjusted);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder='e.g. "Da Hong Pao" or "2020 Yiwu sheng"'
          aria-label="Describe your tea"
          aria-describedby={error ? "ai-error" : undefined}
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus-visible:outline-none focus-visible:border-clay transition-colors duration-150"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-clay text-surface text-[14px] font-medium disabled:opacity-40 transition-opacity duration-150"
        >
          {loading ? (
            <span className="animate-pulse">Identifying...</span>
          ) : (
            "Identify"
          )}
        </button>
      </div>

      {error && <p id="ai-error" role="alert" className="text-[13px] text-error italic">{error}</p>}

      {loading && (
        <div className="bg-surface border border-border rounded-[14px] p-5 mt-2 animate-pulse" aria-busy="true" aria-label="Identifying tea…">
          <div className="h-5 w-2/5 bg-border/50 rounded mb-3" />
          <div className="h-3 w-full bg-border/30 rounded mb-2" />
          <div className="h-3 w-3/4 bg-border/30 rounded mb-4 pb-3 border-b border-border" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-14 bg-border/20 rounded-xl" />
            <div className="h-14 bg-border/20 rounded-xl" />
          </div>
          <div className="h-12 bg-border/20 rounded-[14px] mt-4" />
        </div>
      )}

      {result && (
        <div className="bg-surface border border-border rounded-[14px] p-5 mt-2 detail-enter">
          <h3 className="text-lg font-medium mb-1">{result.teaName}</h3>
          <p className="text-[13px] font-serif-cn italic text-secondary leading-relaxed border-b border-border pb-3 mb-4">
            {result.summary}
          </p>

          {/* Vessel & Leaf steppers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <StepperControl
              label="Vessel"
              value={`${vesselMl}ml`}
              onDecrement={() => handleVesselChange(-10)}
              onIncrement={() => handleVesselChange(10)}
              decrementDisabled={vesselMl <= 40}
              incrementDisabled={vesselMl >= 300}
              decrementLabel="Decrease vessel size"
              incrementLabel="Increase vessel size"
            />
            <StepperControl
              label="Leaf"
              value={`${currentLeaf}g`}
              onDecrement={() => handleLeafChange(-0.5)}
              onIncrement={() => handleLeafChange(0.5)}
              decrementDisabled={currentLeaf <= 0.5}
              incrementDisabled={currentLeaf >= 30}
              decrementLabel="Decrease leaf amount"
              incrementLabel="Increase leaf amount"
              suffix={scheduleAdjusted ? (
                <span className="ml-1.5 normal-case tracking-normal text-gold">
                  adjusted
                </span>
              ) : undefined}
            />
          </div>

          {/* Compact params row */}
          <div className="flex gap-3 text-[13px] text-secondary mb-4">
            <span>{result.tempC}°C</span>
            <span className="text-border">·</span>
            <span>{formatRatio(currentLeaf, vesselMl)}</span>
            <span className="text-border">·</span>
            <span>
              {result.doubleRinse
                ? "Rinse 2×"
                : result.rinse
                  ? "Rinse"
                  : "No rinse"}
            </span>
            <span className="text-border">·</span>
            <span>{displaySchedule.length} infusions</span>
          </div>

          {/* Schedule pills */}
          <div className="border-t border-border pt-3 mb-4">
            <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
              Infusion schedule (seconds)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {displaySchedule.map((s, i) => (
                <span
                  key={i}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium border ${
                    i === 0 ? "bg-clay-soft border-clay/20 text-clay" : "bg-bg border-border text-secondary"
                  }`}
                >
                  {s}s
                </span>
              ))}
            </div>
          </div>

          {/* Start Brewing */}
          <button
            onClick={handleStartBrewing}
            className="w-full py-4 rounded-[14px] bg-clay text-surface font-medium text-[15px] hover:bg-clay-hover shadow-[0_2px_8px_rgba(122,74,53,0.25)]"
            style={{
              transition:
                "background-color 150ms var(--ease-out), transform 160ms var(--ease-out), box-shadow 150ms var(--ease-out)",
            }}
          >
            Start Brewing
          </button>
        </div>
      )}
    </div>
  );
}
