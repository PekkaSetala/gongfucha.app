"use client";

import { useState, useEffect } from "react";
import type { TeaPreset } from "@/data/teas";
import { buildBrewParams } from "@/lib/brewing";

interface TeaDetailProps {
  tea: TeaPreset;
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (params: ReturnType<typeof buildBrewParams>) => void;
  variant: "inline" | "panel";
}

export function TeaDetail({
  tea,
  vesselMl,
  onVesselChange,
  onStartBrewing,
  variant,
}: TeaDetailProps) {
  const [leafOverride, setLeafOverride] = useState<number | null>(null);
  const params = buildBrewParams(tea, vesselMl, leafOverride ?? undefined);

  useEffect(() => {
    setLeafOverride(null);
  }, [tea.id, vesselMl]);

  const handleLeafChange = (value: number) => {
    const clamped = Math.max(0.5, Math.min(30, value));
    setLeafOverride(Math.round(clamped * 10) / 10);
  };

  const handleVesselChange = (value: number) => {
    const clamped = Math.max(40, Math.min(300, value));
    onVesselChange(clamped);
  };

  const stepperBtn =
    "w-9 h-9 rounded-lg border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center";

  return (
    <div className={variant === "panel" ? "detail-enter" : "px-5 mt-1 detail-enter"}>
      <div
        className={`bg-surface border border-border rounded-[14px] ${variant === "panel" ? "p-6" : "p-5"}`}
      >
        {variant === "panel" && (
          <div className="mb-5">
            <h2 className="text-xl font-serif-cn font-medium mb-1">{tea.name}</h2>
            <p className="text-[13px] text-tertiary">{tea.subtitle}</p>
          </div>
        )}

        {/* Vessel & Leaf controls */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
              Vessel
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => handleVesselChange(vesselMl - 10)} className={stepperBtn}>
                −
              </button>
              <span className="text-[14px] font-medium min-w-[48px] text-center">
                {vesselMl}ml
              </span>
              <button onClick={() => handleVesselChange(vesselMl + 10)} className={stepperBtn}>
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
              Leaf
              {params.scheduleAdjusted && (
                <span className="ml-1.5 normal-case tracking-normal text-gold">adjusted</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLeafChange((leafOverride ?? params.recommendedLeaf) - 0.5)}
                className={stepperBtn}
              >
                −
              </button>
              <span className="text-[14px] font-medium min-w-[48px] text-center">
                {params.actualLeaf}g
              </span>
              <button
                onClick={() => handleLeafChange((leafOverride ?? params.recommendedLeaf) + 0.5)}
                className={stepperBtn}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Params row */}
        <div className="flex gap-5 mb-4">
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary">Temp</span>
            <span className="text-[14px] font-medium">{params.tempC}°C</span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary">Rinse</span>
            <span className="text-[14px] font-medium">
              {tea.doubleRinse ? "2×" : tea.rinse ? "Yes" : "No"}
            </span>
          </div>
        </div>

        {/* Brew note */}
        <p className="text-[13px] font-serif-cn italic text-secondary leading-relaxed border-t border-border pt-4 mb-4">
          {params.brewNote}
        </p>

        {/* Schedule pills (panel only) */}
        {variant === "panel" && (
          <div className="border-t border-border pt-4 mb-5">
            <span className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-2.5">
              Infusion schedule (seconds)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {params.schedule.map((s, i) => (
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
        )}

        {/* Start Brewing */}
        <button
          onClick={() => onStartBrewing(params)}
          className="w-full py-4 rounded-[14px] bg-clay text-[#FAF7F2] font-medium text-[15px]"
          style={{
            transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
          }}
        >
          Start Brewing
        </button>
      </div>
    </div>
  );
}
