"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { teaGroups, getTeaById, type TeaGroup, type TeaPreset } from "@/data/teas";
import type { BrewParams } from "./BrewingTimer";
import { TeaDetail, type VariantOption } from "./TeaDetail";
import { AIAdvisor } from "./AIAdvisor";
import { CustomMode } from "./CustomMode";
import type { AIResult } from "./AIAdvisor";

interface TeaListProps {
  expandedGroupId: string | null;
  selectedVariantId: string | null;
  onGroupToggle: (groupId: string) => void;
  onVariantSelect: (variantId: string) => void;
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
  onOpenPrimer?: () => void;
}

export function TeaList({
  expandedGroupId,
  selectedVariantId,
  onGroupToggle,
  onVariantSelect,
  selectedTea,
  aiExpanded,
  onToggleAI,
  customExpanded,
  onToggleCustom,
  vesselMl,
  onVesselChange,
  onStartBrewing,
  onAIBrew,
  onOpenPrimer,
}: TeaListProps) {
  const detailRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);
  const [crossfadeState, setCrossfadeState] = useState<"idle" | "exit" | "enter">("idle");
  const [trackedVariantId, setTrackedVariantId] = useState<string | null>(selectedVariantId);

  // Detect variant change during render and trigger crossfade exit immediately.
  if (trackedVariantId !== selectedVariantId) {
    setTrackedVariantId(selectedVariantId);
    if (trackedVariantId && selectedVariantId) {
      setCrossfadeState("exit");
    }
  }

  // Scroll detail into view when group expands or variant selected
  useEffect(() => {
    if (expandedGroupId && detailRef.current) {
      const frame = requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [expandedGroupId]);

  // Drive the exit → enter → idle timeline after a crossfade starts.
  useEffect(() => {
    if (crossfadeState === "exit") {
      const t = setTimeout(() => setCrossfadeState("enter"), 100);
      return () => clearTimeout(t);
    }
    if (crossfadeState === "enter") {
      const t = setTimeout(() => setCrossfadeState("idle"), 150);
      return () => clearTimeout(t);
    }
  }, [crossfadeState]);

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

  const getCrossfadeClass = useCallback(() => {
    switch (crossfadeState) {
      case "exit": return "variant-exit";
      case "enter": return "variant-enter";
      default: return "";
    }
  }, [crossfadeState]);

  /** Resolve display values for a row — works for both standalone and group */
  function getRowDisplay(entry: TeaGroup | string): {
    id: string;
    name: string;
    subtitle: string;
    color: string;
    tempC: number;
    isGroup: boolean;
  } {
    if (typeof entry === "string") {
      const tea = getTeaById(entry)!;
      return {
        id: tea.id,
        name: tea.name,
        subtitle: tea.subtitle,
        color: tea.color,
        tempC: tea.tempC,
        isGroup: false,
      };
    }
    // For groups with a selected variant, show variant's values
    const activeVariant = selectedVariantId && entry.variants.includes(selectedVariantId)
      ? getTeaById(selectedVariantId)
      : null;
    return {
      id: entry.id,
      name: entry.name,
      subtitle: activeVariant ? activeVariant.subtitle : entry.subtitle,
      color: activeVariant ? activeVariant.color : entry.categoryColor,
      tempC: activeVariant ? activeVariant.tempC : entry.displayTempC,
      isGroup: true,
    };
  }

  return (
    <div className="flex flex-col gap-2 px-5" role="group" aria-label="Tea selection">
      {teaGroups.map((entry, index) => {
        const display = getRowDisplay(entry);
        const expanded = expandedGroupId === display.id;
        const isGroup = display.isGroup;
        const group = typeof entry !== "string" ? entry : null;

        return (
          <div key={display.id}>
            <button
              onClick={() => onGroupToggle(display.id)}
              aria-expanded={expanded}
              className={`
                tea-stagger w-full
                flex items-center gap-3.5 px-4 py-3.5 text-left
                border
                ${expanded
                  ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)]"
                  : "rounded-[14px] border-border bg-surface hover-lift"
                }
              `}
              style={{
                animationDelay: `${index * 40}ms`,
                transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out), border-radius 200ms var(--ease-out)",
                backgroundColor: expanded ? `color-mix(in srgb, ${display.color} 6%, var(--color-surface))` : undefined,
              }}
            >
              <span
                className="w-5 h-5 rounded-full shrink-0"
                style={{
                  backgroundColor: display.color,
                  transition: "transform 250ms var(--ease-out), box-shadow 250ms var(--ease-out), background-color 160ms var(--ease-out)",
                  transform: expanded ? "scale(1.15)" : "scale(1)",
                  boxShadow: expanded ? `0 0 0 3px color-mix(in srgb, ${display.color} 20%, transparent)` : "none",
                }}
              />
              <span className="flex-1 min-w-0">
                <span className="text-[15px] font-serif-cn font-normal text-primary">
                  {display.name}
                </span>
                <span
                  className="block text-[12px] text-tertiary mt-0.5 truncate"
                  style={{ transition: "opacity 160ms var(--ease-out)" }}
                >
                  {display.subtitle}
                </span>
              </span>
              <span
                className="text-[13px] font-medium text-secondary shrink-0"
                style={{ transition: "opacity 160ms var(--ease-out)" }}
              >
                {display.tempC}°C
              </span>
            </button>

            {/* Accordion body */}
            <div
              className="grid transition-[grid-template-rows] duration-300"
              style={{
                gridTemplateRows: expanded ? "1fr" : "0fr",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="overflow-hidden">
                {expanded && (
                  <div
                    className="border border-t-0 border-clay/30 rounded-b-[14px] pb-1"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${display.color} 4%, var(--color-surface))`,
                    }}
                  >
                    {selectedTea && (
                      <div ref={detailRef} className={getCrossfadeClass()}>
                        <TeaDetail
                          tea={selectedTea}
                          vesselMl={vesselMl}
                          onVesselChange={onVesselChange}
                          onStartBrewing={onStartBrewing}
                          variant="inline"
                          variants={
                            isGroup && group
                              ? group.variants.map((vid, vi) => {
                                  const v = getTeaById(vid)!;
                                  return {
                                    id: vid,
                                    label: group.variantLabels[vi],
                                    subtitle: v.subtitle,
                                    color: v.color,
                                  } satisfies VariantOption;
                                })
                              : undefined
                          }
                          activeVariantId={selectedVariantId ?? undefined}
                          onVariantChange={onVariantSelect}
                        />
                      </div>
                    )}
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

      {/* Search — accordion row */}
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
              Search
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

      {/* ─── Primer endnote ─── */}
      {onOpenPrimer && (
        <div className="px-5 pt-10 pb-2 flex justify-center">
          <button
            type="button"
            onClick={onOpenPrimer}
            className="group text-[13px] text-tertiary italic leading-relaxed hover:text-secondary"
            style={{ transition: "color 150ms var(--ease-out)" }}
          >
            what is gongfu cha?{" "}
            <span
              aria-hidden="true"
              className="inline-block group-hover:translate-x-0.5"
              style={{ transition: "transform 160ms var(--ease-out)" }}
            >
              →
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
