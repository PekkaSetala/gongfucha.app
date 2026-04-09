"use client";

import { useState, useEffect, useRef } from "react";
import { getTeaById, teaGroups } from "@/data/teas";
import { Header } from "@/components/Header";
import { TeaList } from "@/components/TeaList";
import { BrewingTimer } from "@/components/BrewingTimer";
import { SecondaryPaths } from "@/components/SecondaryPaths";
import { GuideIndex } from "@/components/guide/GuideIndex";
import { GuidePrimer } from "@/components/guide/GuidePrimer";
import { GuideEntry } from "@/components/guide/GuideEntry";
import type { AIResult } from "@/components/AIAdvisor";
import type { BrewParams } from "@/components/BrewingTimer";
import type { TeaEntry } from "@/data/corpus/schema";
import { getTeaColor } from "@/data/tea-categories";

const VESSEL_KEY = "gongfucha-vessel-ml";
const DEFAULT_VESSEL = 120;

function getStoredVessel(): number {
  if (typeof window === "undefined") return DEFAULT_VESSEL;
  const stored = localStorage.getItem(VESSEL_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_VESSEL;
}

async function loadCorpusEntries(): Promise<Record<string, TeaEntry>> {
  const mod = await import("@/data/corpus/entries");
  return mod.corpusEntries;
}

type ViewState =
  | "list"
  | "enter-brewing"
  | "brewing"
  | "exit-brewing"
  | "guide-index"
  | "guide-primer"
  | "guide-entry";

type GuideEntryOrigin = "guide-index" | "ai-advisor";

export default function Home() {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [vesselMl, setVesselMl] = useState(DEFAULT_VESSEL);
  const [brewParams, setBrewParams] = useState<BrewParams | null>(null);
  const [viewState, setViewState] = useState<ViewState>("list");
  const timerRef = useRef<HTMLDivElement>(null);

  // Guide state
  const [guideEntries, setGuideEntries] = useState<Record<string, TeaEntry> | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideSelectedEntryId, setGuideSelectedEntryId] = useState<string | null>(null);
  const [guideEntryOrigin, setGuideEntryOrigin] = useState<GuideEntryOrigin>("guide-index");
  const guideScrollY = useRef<number>(0);

  useEffect(() => {
    setVesselMl(getStoredVessel());
  }, []);

  useEffect(() => {
    if (viewState !== "list") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [viewState]);

  useEffect(() => {
    if (brewParams) {
      document.title = `Brewing ${brewParams.teaName} — Gongfu Cha`;
    } else {
      document.title = "Gongfu Cha";
    }
  }, [brewParams]);

  const handleVesselChange = (ml: number) => {
    setVesselMl(ml);
    localStorage.setItem(VESSEL_KEY, String(ml));
  };

  const handleGroupToggle = (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setSelectedVariantId(null);
    } else {
      setExpandedGroupId(groupId);
      // Standalone teas auto-select immediately (no pill step)
      const entry = teaGroups.find(
        (g) => (typeof g === "string" ? g : g.id) === groupId
      );
      if (typeof entry === "string") {
        setSelectedVariantId(entry);
      } else if (entry) {
        // Grouped teas auto-select first variant so the detail card renders immediately
        setSelectedVariantId(entry.variants[0]);
      } else {
        setSelectedVariantId(null);
      }
    }
    setAiExpanded(false);
    setCustomExpanded(false);
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  const handleToggleAI = () => {
    setAiExpanded(!aiExpanded);
    setExpandedGroupId(null);
    setSelectedVariantId(null);
    setCustomExpanded(false);
  };

  const handleToggleCustom = () => {
    setCustomExpanded(!customExpanded);
    setExpandedGroupId(null);
    setSelectedVariantId(null);
    setAiExpanded(false);
  };

  const handleStartBrewing = (params: BrewParams) => {
    setBrewParams(params);
    setViewState("enter-brewing");

    // Phase 1: list fades out (700ms)
    // Phase 2: bridge holds + brewing fades in (800ms + 150ms delay)
    setTimeout(() => {
      setViewState("brewing");
    }, 1500);
  };

  const handleAIBrew = (
    result: AIResult,
    aiVesselMl: number,
    leafG: number,
    schedule: number[],
    adjusted: boolean
  ) => {
    const recommendedLeaf =
      Math.round(result.ratioGPerMl * aiVesselMl * 10) / 10;
    const teaId = result.categoryId || "custom";
    handleStartBrewing({
      teaId,
      teaName: result.teaName,
      teaColor: getTeaColor(teaId),
      tempC: result.tempC,
      vesselMl: aiVesselMl,
      recommendedLeaf,
      actualLeaf: leafG,
      rinse: result.rinse,
      doubleRinse: result.doubleRinse,
      schedule,
      scheduleAdjusted: adjusted,
      brewNote: result.summary,
    });
  };

  const handleEndBrewing = () => {
    setViewState("exit-brewing");
    setTimeout(() => {
      setBrewParams(null);
      setViewState("list");
    }, 800);
  };

  // ── Guide handlers ──
  const ensureGuideEntriesLoaded = async () => {
    if (guideEntries) return guideEntries;
    setGuideLoading(true);
    const loaded = await loadCorpusEntries();
    setGuideEntries(loaded);
    setGuideLoading(false);
    return loaded;
  };

  const handleOpenGuide = async () => {
    setViewState("guide-index");
    await ensureGuideEntriesLoaded();
  };

  const handleOpenGuidePrimer = () => {
    setViewState("guide-primer");
  };

  const handleOpenGuideEntryFromIndex = (id: string) => {
    setGuideSelectedEntryId(id);
    setGuideEntryOrigin("guide-index");
    setViewState("guide-entry");
  };

  const handleOpenGuideEntryFromAdvisor = async (id: string) => {
    await ensureGuideEntriesLoaded();
    setGuideSelectedEntryId(id);
    setGuideEntryOrigin("ai-advisor");
    setViewState("guide-entry");
  };

  const handleBackFromGuideIndex = () => {
    setViewState("list");
  };

  const handleBackFromGuidePrimer = () => {
    setViewState("guide-index");
  };

  const handleBackFromGuideEntry = () => {
    if (guideEntryOrigin === "guide-index") {
      setViewState("guide-index");
    } else {
      setViewState("list");
    }
    setGuideSelectedEntryId(null);
  };

  const handleGuideScrollYChange = (y: number) => {
    guideScrollY.current = y;
  };

  const bridgeColor = brewParams?.teaColor || "#8C563E";
  const showBrewing = viewState === "enter-brewing" || viewState === "brewing" || viewState === "exit-brewing";
  const isGuideView = viewState === "guide-index" || viewState === "guide-primer" || viewState === "guide-entry";

  const selectedTea = selectedVariantId ? getTeaById(selectedVariantId) ?? null : null;

  return (
    <div className="relative min-h-[100dvh]">
      {/* ─── Bridge overlay ─── */}
      {viewState === "enter-brewing" && (
        <div
          className="fixed inset-0 pointer-events-none bridge-overlay"
          style={{
            background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${bridgeColor} 25%, transparent), transparent 70%)`,
            zIndex: 50,
          }}
        />
      )}

      {/* ─── Main list view ─── */}
      <div
        className={`${
          viewState === "enter-brewing"
            ? "view-fade-out"
            : viewState === "exit-brewing"
              ? "view-fade-in-slow"
              : viewState === "brewing" || isGuideView
                ? "opacity-0 pointer-events-none"
                : ""
        }`}
        style={{
          position: viewState === "brewing" ? "absolute" : undefined,
          inset: viewState === "brewing" ? 0 : undefined,
        }}
      >
        <main id="main-content" className="flex-1">
          <div className="max-w-[680px] mx-auto min-h-screen">
            <Header />
            <div className="max-w-[680px] mx-auto">
              <TeaList
                expandedGroupId={expandedGroupId}
                selectedVariantId={selectedVariantId}
                onGroupToggle={handleGroupToggle}
                onVariantSelect={handleVariantSelect}
                selectedTea={selectedTea}
                aiExpanded={aiExpanded}
                onToggleAI={handleToggleAI}
                customExpanded={customExpanded}
                onToggleCustom={handleToggleCustom}
                vesselMl={vesselMl}
                onVesselChange={handleVesselChange}
                onStartBrewing={handleStartBrewing}
                onAIBrew={handleAIBrew}
                onOpenGuideEntry={handleOpenGuideEntryFromAdvisor}
              />
              <SecondaryPaths onOpenGuide={handleOpenGuide} />
            </div>
            <footer className="px-5 pt-10 pb-14 text-center">
              <a
                href="https://pekkasetala.carrd.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-tertiary/40 tracking-[1.5px] lowercase hover:text-tertiary/60 transition-colors duration-200"
              >
                pekka setälä
              </a>
            </footer>
          </div>
        </main>
      </div>

      {/* ─── Brewing view ─── */}
      {showBrewing && brewParams && (
        <div
          ref={timerRef}
          className={`${
            viewState === "enter-brewing"
              ? "view-fade-in"
              : viewState === "exit-brewing"
                ? "view-fade-out-slow"
                : ""
          }`}
          style={{
            position: viewState !== "brewing" ? "absolute" : undefined,
            inset: viewState !== "brewing" ? 0 : undefined,
            zIndex: viewState !== "brewing" ? 40 : undefined,
          }}
        >
          <BrewingTimer params={brewParams} onEnd={handleEndBrewing} />
        </div>
      )}

      {/* ─── Guide views ─── */}
      {isGuideView && (
        <div className="fixed inset-0 bg-surface z-40 overflow-hidden">
          {guideLoading && !guideEntries && (
            <div className="min-h-[100dvh] flex items-center justify-center text-tertiary text-[13px]">
              Loading…
            </div>
          )}

          {guideEntries && viewState === "guide-index" && (
            <GuideIndex
              entries={guideEntries}
              onOpenPrimer={handleOpenGuidePrimer}
              onOpenEntry={handleOpenGuideEntryFromIndex}
              onBack={handleBackFromGuideIndex}
              initialScrollY={guideScrollY.current}
              onScrollYChange={handleGuideScrollYChange}
            />
          )}

          {viewState === "guide-primer" && (
            <GuidePrimer onBack={handleBackFromGuidePrimer} />
          )}

          {guideEntries &&
            viewState === "guide-entry" &&
            guideSelectedEntryId &&
            guideEntries[guideSelectedEntryId] && (
              <GuideEntry
                entry={guideEntries[guideSelectedEntryId]}
                vesselMl={vesselMl}
                onVesselChange={handleVesselChange}
                onStartBrewing={handleStartBrewing}
                onBack={handleBackFromGuideEntry}
              />
            )}
        </div>
      )}
    </div>
  );
}
