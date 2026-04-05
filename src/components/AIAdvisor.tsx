"use client";

import { useState } from "react";
import {
  calculateLeafAmount,
  actualRatio,
  adjustSchedule,
  isScheduleAdjusted,
} from "@/lib/brewing";

interface AIResult {
  teaName: string;
  summary: string;
  tempC: number;
  ratioGPerMl: number;
  rinse: boolean;
  doubleRinse: boolean;
  schedule: number[];
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

  const stepperBtn =
    "w-9 h-9 rounded-lg border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-secondary leading-relaxed">
        Name or describe your tea — get gongfu brewing parameters.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder='e.g. "Da Hong Pao" or "2020 Yiwu sheng"'
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus:outline-none focus:border-clay transition-colors duration-150"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-clay text-[#FAF7F2] text-[14px] font-medium disabled:opacity-40 transition-opacity duration-150"
        >
          {loading ? (
            <span className="animate-pulse">Identifying...</span>
          ) : (
            "Identify"
          )}
        </button>
      </div>

      {error && <p className="text-[13px] text-clay italic">{error}</p>}

      {result && (
        <div className="bg-surface border border-border rounded-[14px] p-5 mt-2 detail-enter">
          <h3 className="text-lg font-medium mb-1">{result.teaName}</h3>
          <p className="text-[13px] font-serif-cn italic text-secondary leading-relaxed border-b border-border pb-3 mb-4">
            {result.summary}
          </p>

          {/* Vessel & Leaf steppers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
                Vessel
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVesselChange(-10)}
                  className={stepperBtn}
                >
                  −
                </button>
                <span className="text-[14px] font-medium min-w-[48px] text-center">
                  {vesselMl}ml
                </span>
                <button
                  onClick={() => handleVesselChange(10)}
                  className={stepperBtn}
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
                Leaf
                {scheduleAdjusted && (
                  <span className="ml-1.5 normal-case tracking-normal text-gold">
                    adjusted
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLeafChange(-0.5)}
                  className={stepperBtn}
                >
                  −
                </button>
                <span className="text-[14px] font-medium min-w-[48px] text-center">
                  {currentLeaf}g
                </span>
                <button
                  onClick={() => handleLeafChange(0.5)}
                  className={stepperBtn}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Compact params row */}
          <div className="flex gap-3 text-[13px] text-secondary mb-4">
            <span>{result.tempC}°C</span>
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

          {/* Start Brewing */}
          <button
            onClick={handleStartBrewing}
            className="w-full py-4 rounded-[14px] bg-clay text-[#FAF7F2] font-medium text-[15px]"
            style={{
              transition:
                "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
            }}
          >
            Start Brewing
          </button>
        </div>
      )}
    </div>
  );
}
