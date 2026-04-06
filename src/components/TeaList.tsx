"use client";

import { useRef, useEffect } from "react";
import type { TeaPreset } from "@/data/teas";
import type { BrewParams } from "./BrewingTimer";
import { TeaDetail } from "./TeaDetail";

interface TeaListProps {
  teas: TeaPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedTea: TeaPreset | null;
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (params: BrewParams) => void;
}

export function TeaList({
  teas,
  selectedId,
  onSelect,
  selectedTea,
  vesselMl,
  onVesselChange,
  onStartBrewing,
}: TeaListProps) {
  const detailRef = useRef<HTMLDivElement>(null);

  // Scroll the detail into view after it renders
  useEffect(() => {
    if (selectedId && detailRef.current) {
      // Wait for the grid animation to start, then scroll
      const frame = requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-2 px-5" role="group" aria-label="Tea selection">
      {teas.map((tea, index) => {
        const selected = tea.id === selectedId;
        return (
          <div key={tea.id}>
            <button
              onClick={() => onSelect(tea.id)}
              aria-pressed={selected}
              aria-expanded={selected}
              className={`
                tea-stagger hover-lift w-full
                flex items-center gap-3.5 px-4 py-3.5 text-left
                border
                ${selected
                  ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)]"
                  : "rounded-[14px] border-border bg-surface"
                }
              `}
              style={{
                animationDelay: `${index * 40}ms`,
                transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out), border-radius 200ms var(--ease-out)",
                backgroundColor: selected ? `color-mix(in srgb, ${tea.color} 6%, var(--color-surface))` : undefined,
              }}
            >
              <span
                className="w-5 h-5 rounded-full shrink-0"
                style={{
                  backgroundColor: tea.color,
                  transition: "transform 250ms var(--ease-out), box-shadow 250ms var(--ease-out)",
                  transform: selected ? "scale(1.15)" : "scale(1)",
                  boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${tea.color} 20%, transparent)` : "none",
                }}
              />
              <span className="flex-1 min-w-0">
                <span className="text-[15px] font-serif-cn font-normal text-primary">
                  {tea.name}
                </span>
                <span className="block text-[12px] text-tertiary mt-0.5 truncate">
                  {tea.subtitle}
                </span>
              </span>
              <span className="text-[13px] font-medium text-secondary shrink-0">
                {tea.tempC}°C
              </span>
            </button>

            {/* Accordion detail — grid row animation for smooth height */}
            <div
              className="grid transition-[grid-template-rows] duration-300"
              style={{
                gridTemplateRows: selected ? "1fr" : "0fr",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="overflow-hidden">
                {selected && selectedTea && (
                  <div
                    ref={detailRef}
                    className="border border-t-0 border-clay/30 rounded-b-[14px] pb-1"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${tea.color} 4%, var(--color-surface))`,
                    }}
                  >
                    <TeaDetail
                      tea={selectedTea}
                      vesselMl={vesselMl}
                      onVesselChange={onVesselChange}
                      onStartBrewing={onStartBrewing}
                      variant="inline"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
