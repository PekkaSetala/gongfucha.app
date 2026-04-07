"use client";

import { useState, useEffect } from "react";
import type { TeaPreset } from "@/data/teas";
import { buildBrewParams, formatRatio } from "@/lib/brewing";
import { StepperControl } from "./StepperControl";

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

  return (
    <div className={variant === "panel" ? "detail-enter" : "px-5 pt-3 detail-enter"}>
      <div
        className={`bg-surface border border-border rounded-[14px] ${variant === "panel" ? "p-6" : "p-5"}`}
      >
        {variant === "panel" && (
          <div className="mb-5">
            <h2 className="text-xl font-serif-cn font-bold mb-1">{tea.name}</h2>
            <p className="text-[13px] text-tertiary">{tea.subtitle}</p>
          </div>
        )}

        {/* Vessel & Leaf controls */}
        <div className="flex justify-around mb-4">
          <StepperControl
            label="Vessel"
            value={`${vesselMl}ml`}
            onDecrement={() => handleVesselChange(vesselMl - 10)}
            onIncrement={() => handleVesselChange(vesselMl + 10)}
            decrementDisabled={vesselMl <= 40}
            incrementDisabled={vesselMl >= 300}
            decrementLabel="Decrease vessel size"
            incrementLabel="Increase vessel size"
          />
          <StepperControl
            label="Leaf"
            value={`${params.actualLeaf}g`}
            onDecrement={() => handleLeafChange((leafOverride ?? params.recommendedLeaf) - 0.5)}
            onIncrement={() => handleLeafChange((leafOverride ?? params.recommendedLeaf) + 0.5)}
            decrementDisabled={params.actualLeaf <= 0.5}
            incrementDisabled={params.actualLeaf >= 30}
            decrementLabel="Decrease leaf amount"
            incrementLabel="Increase leaf amount"
            suffix={params.scheduleAdjusted ? (
              <span className="ml-1.5 normal-case tracking-normal text-gold">adjusted</span>
            ) : undefined}
          />
        </div>

        {/* Reset to defaults */}
        {leafOverride !== null && (
          <button
            onClick={() => setLeafOverride(null)}
            className="text-[12px] text-tertiary underline underline-offset-2 mb-3 hover:text-secondary mx-auto block"
            style={{ transition: "color 150ms var(--ease-out)" }}
          >
            Reset to defaults
          </button>
        )}

        {/* Params row */}
        <div className="flex justify-around text-center mb-4">
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Temp</span>
            <span className="text-[14px] font-medium">{params.tempC}°C</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Ratio</span>
            <span className="text-[14px] font-medium">{formatRatio(params.actualLeaf, params.vesselMl)}</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Rinse</span>
            <span className="text-[14px] font-medium">
              {tea.doubleRinse ? "2×" : tea.rinse ? "Yes" : "No"}
            </span>
          </div>
        </div>

        {/* Brew note */}
        <p className="text-[13px] font-serif-cn italic text-secondary leading-relaxed border-t border-border pt-4 mb-4 text-center">
          {params.brewNote}
        </p>

        {/* Schedule pills */}
        <div className={`border-t border-border pt-4 mb-5 ${variant === "inline" ? "mt-1" : ""}`}>
            <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2.5 text-center">
              Infusion schedule (seconds)
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
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

        {/* Start Brewing */}
        <button
          onClick={() => onStartBrewing(params)}
          className="w-full py-4 rounded-[14px] bg-clay text-surface font-medium text-[15px] hover:bg-clay-hover shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(122,74,53,0.18)]"
          style={{
            transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out), box-shadow 150ms var(--ease-out)",
          }}
        >
          Start Brewing
        </button>
      </div>
    </div>
  );
}
