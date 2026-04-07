"use client";

import { useRef, useEffect } from "react";
import type { TeaPreset } from "@/data/teas";
import type { BrewParams } from "./BrewingTimer";
import { TeaDetail } from "./TeaDetail";
import { AIAdvisor } from "./AIAdvisor";
import { CustomMode } from "./CustomMode";
import type { AIResult } from "./AIAdvisor";

interface TeaListProps {
  teas: TeaPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedTea: TeaPreset | null;
  aiExpanded: boolean;
  onToggleAI: () => void;
  customExpanded: boolean;
  onToggleCustom: () => void;
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (params: BrewParams) => void;
  onAIBrew: (
    result: AIResult,
    vesselMl: number,
    leafG: number,
    schedule: number[],
    adjusted: boolean
  ) => void;
}

export function TeaList({
  teas,
  selectedId,
  onSelect,
  selectedTea,
  aiExpanded,
  onToggleAI,
  customExpanded,
  onToggleCustom,
  vesselMl,
  onVesselChange,
  onStartBrewing,
  onAIBrew,
}: TeaListProps) {
  const detailRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);

  // Scroll the detail into view after it renders
  useEffect(() => {
    if (selectedId && detailRef.current) {
      const frame = requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [selectedId]);

  // Scroll AI into view when expanded
  useEffect(() => {
    if (aiExpanded && aiRef.current) {
      const frame = requestAnimationFrame(() => {
        aiRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [aiExpanded]);

  // Scroll Custom into view when expanded
  useEffect(() => {
    if (customExpanded && customRef.current) {
      const frame = requestAnimationFrame(() => {
        customRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [customExpanded]);

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
                tea-stagger w-full
                flex items-center gap-3.5 px-4 py-3.5 text-left
                border
                ${selected
                  ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)]"
                  : "rounded-[14px] border-border bg-surface hover-lift"
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

      {/* ─── Divider ─── */}
      <p className="text-[11px] text-tertiary/40 tracking-[1.5px] uppercase text-center my-1">
        or
      </p>

      {/* Ask AI — accordion row */}
      <div>
        <button
          onClick={onToggleAI}
          aria-pressed={aiExpanded}
          aria-expanded={aiExpanded}
          className={`
            hover-lift w-full
            flex items-center gap-3.5 px-4 py-3.5 text-left
            border
            ${aiExpanded
              ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)] bg-surface"
              : "rounded-[14px] border-border bg-surface"
            }
          `}
          style={{
            transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out), border-radius 200ms var(--ease-out)",
          }}
        >
          <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-border/40">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <path d="M6.5 8h5M6.5 10.5h3" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-[15px] font-medium text-primary">
              Ask AI
            </span>
            <span className="block text-[12px] text-tertiary mt-0.5">
              Describe your tea, get brew parameters
            </span>
          </span>
        </button>

        {/* AI accordion detail */}
        <div
          className="grid transition-[grid-template-rows] duration-300"
          style={{
            gridTemplateRows: aiExpanded ? "1fr" : "0fr",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <div className="overflow-hidden">
            {aiExpanded && (
              <div
                ref={aiRef}
                className="border border-t-0 border-clay/30 rounded-b-[14px] p-5"
              >
                <AIAdvisor
                  vesselMl={vesselMl}
                  onVesselChange={onVesselChange}
                  onStartBrewing={onAIBrew}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom — accordion row */}
      <div>
        <button
          onClick={onToggleCustom}
          aria-pressed={customExpanded}
          aria-expanded={customExpanded}
          className={`
            hover-lift w-full
            flex items-center gap-3.5 px-4 py-3.5 text-left
            border
            ${customExpanded
              ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)] bg-surface"
              : "rounded-[14px] border-border bg-surface"
            }
          `}
          style={{
            transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out), border-radius 200ms var(--ease-out)",
          }}
        >
          <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-border/40">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6.5h12M3 11.5h12" />
              <circle cx="7" cy="6.5" r="1.5" fill="var(--color-bg)" />
              <circle cx="11" cy="11.5" r="1.5" fill="var(--color-bg)" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-[15px] font-medium text-primary">
              Custom
            </span>
            <span className="block text-[12px] text-tertiary mt-0.5">
              Set your own parameters
            </span>
          </span>
        </button>

        {/* Custom accordion detail */}
        <div
          className="grid transition-[grid-template-rows] duration-300"
          style={{
            gridTemplateRows: customExpanded ? "1fr" : "0fr",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <div className="overflow-hidden">
            {customExpanded && (
              <div
                ref={customRef}
                className="border border-t-0 border-clay/30 rounded-b-[14px] p-5"
              >
                <CustomMode
                  vesselMl={vesselMl}
                  onStartBrewing={onStartBrewing}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
