"use client";

import { useState } from "react";
import { InlineViewHeader } from "@/components/InlineViewHeader";
import { StepperControl } from "@/components/StepperControl";
import { BrewingTimeline } from "./BrewingTimeline";
import { corpusEntryToTeaPreset } from "@/lib/corpus-adapter";
import { buildBrewParams } from "@/lib/brewing";
import { corpusCategoryColor, corpusCategoryLabel } from "@/data/corpus-categories";
import type { TeaEntry } from "@/data/corpus/schema";
import type { BrewParams } from "@/components/BrewingTimer";

interface GuideEntryProps {
  entry: TeaEntry;
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (params: BrewParams) => void;
  onBack: () => void;
}

/**
 * Extracts the first alias that looks like Chinese characters
 * (any character in the CJK Unified Ideographs block).
 * Returns undefined when no alias contains Chinese.
 */
function extractChineseName(entry: TeaEntry): string | undefined {
  for (const alias of entry.aliases) {
    if (/[\u4e00-\u9fff]/.test(alias)) return alias;
  }
  return undefined;
}

/**
 * Extracts the pinyin alias — first alias with Latin letters and
 * diacritic marks, excluding the English name itself.
 */
function extractPinyin(entry: TeaEntry): string | undefined {
  for (const alias of entry.aliases) {
    if (alias === entry.name) continue;
    if (/[\u4e00-\u9fff]/.test(alias)) continue;
    if (/[\u00C0-\u024F]/.test(alias)) return alias;
  }
  return undefined;
}

export function GuideEntry({
  entry,
  vesselMl,
  onVesselChange,
  onStartBrewing,
  onBack,
}: GuideEntryProps) {
  const preset = corpusEntryToTeaPreset(entry);
  const [leafOverride, setLeafOverride] = useState<number | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const chineseName = extractChineseName(entry);
  const pinyin = extractPinyin(entry);
  const categoryColor = corpusCategoryColor(entry.category);
  const categoryLabel = corpusCategoryLabel(entry.category);

  const handleLeafChange = (value: number) => {
    const clamped = Math.max(0.5, Math.min(30, value));
    setLeafOverride(Math.round(clamped * 10) / 10);
  };

  const params = buildBrewParams(preset, vesselMl, leafOverride ?? undefined);

  const handleBrew = () => {
    onStartBrewing(params);
  };

  return (
    <div className="min-h-[100dvh] bg-surface">
      <InlineViewHeader title={entry.name} onBack={onBack} />

      <article className="max-w-[680px] mx-auto px-5 py-6 text-primary">
        {/* Name block */}
        <header className="mb-6">
          <h1 className="font-serif-cn text-[32px] leading-tight">{entry.name}</h1>
          {chineseName && (
            <p
              lang="zh"
              className="font-serif-cn text-[20px] text-secondary mt-1"
            >
              {chineseName}
            </p>
          )}
          {pinyin && (
            <p className="text-[13px] text-tertiary italic mt-0.5">{pinyin}</p>
          )}
        </header>

        {/* Category + region */}
        <div className="flex items-center gap-2 text-[13px] text-tertiary mb-4">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: categoryColor }}
            aria-hidden="true"
          />
          <span>{categoryLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{entry.region}</span>
        </div>

        {entry.terroir && (
          <p className="text-[13px] text-tertiary leading-[1.6] mb-6">
            {entry.terroir}
          </p>
        )}

        {/* Flavor profile */}
        <p className="font-serif-cn text-[17px] leading-[1.7] mb-8">
          {entry.flavor_profile}
        </p>

        {/* Brewing schedule */}
        <div className="mb-6">
          <BrewingTimeline
            tempC={entry.brewing.temp_c}
            ratioG100ml={entry.brewing.ratio_g_per_100ml}
            scheduleSeconds={entry.brewing.schedule_s}
          />
        </div>

        {/* Vessel + Leaf controls */}
        <div className="flex justify-around mb-6">
          <StepperControl
            label="Vessel"
            value={`${vesselMl}ml`}
            onDecrement={() => onVesselChange(vesselMl - 10)}
            onIncrement={() => onVesselChange(vesselMl + 10)}
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

        {/* Aroma + taste pills */}
        {(entry.aroma_notes.length > 0 || entry.taste_notes.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-8">
            {entry.aroma_notes.map((note) => (
              <span
                key={`aroma-${note}`}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-tertiary"
              >
                {note}
              </span>
            ))}
            {entry.taste_notes.map((note) => (
              <span
                key={`taste-${note}`}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-tertiary"
              >
                {note}
              </span>
            ))}
          </div>
        )}

        {/* Brew this */}
        <button
          type="button"
          onClick={handleBrew}
          className="w-full py-4 rounded-[14px] text-white text-[15px] font-medium"
          style={{
            backgroundColor: categoryColor,
            transition: "transform 160ms var(--ease-out)",
          }}
        >
          Brew this
        </button>

        {/* Sources disclosure */}
        {entry.sources.length > 0 && (
          <details
            className="mt-10 text-[12px] text-tertiary"
            open={sourcesOpen}
            onToggle={(e) => setSourcesOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer select-none">
              Sources ({entry.sources.length})
            </summary>
            <ul className="mt-2 space-y-1 list-none pl-0">
              {entry.sources.map((url) => (
                <li key={url} className="truncate">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-secondary"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </article>
    </div>
  );
}
