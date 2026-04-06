"use client";

import { useState, useEffect, useRef } from "react";
import { getTeas, getTeaById } from "@/data/teas";
import { Header } from "@/components/Header";
import { TeaList } from "@/components/TeaList";
import { BrewingTimer } from "@/components/BrewingTimer";
import type { AIResult } from "@/components/AIAdvisor";
import type { BrewParams } from "@/components/BrewingTimer";
import { getTeaColor } from "@/data/tea-categories";

const VESSEL_KEY = "gongfucha-vessel-ml";
const DEFAULT_VESSEL = 120;

function getStoredVessel(): number {
  if (typeof window === "undefined") return DEFAULT_VESSEL;
  const stored = localStorage.getItem(VESSEL_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_VESSEL;
}

type ViewState = "list" | "enter-brewing" | "brewing" | "exit-brewing";

export default function Home() {
  const teas = getTeas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [vesselMl, setVesselMl] = useState(DEFAULT_VESSEL);
  const [brewParams, setBrewParams] = useState<BrewParams | null>(null);
  const [viewState, setViewState] = useState<ViewState>("list");
  const timerRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (id: string) => {
    setSelectedId(selectedId === id ? null : id);
    setAiExpanded(false);
    setCustomExpanded(false);
  };

  const handleToggleAI = () => {
    setAiExpanded(!aiExpanded);
    setSelectedId(null);
    setCustomExpanded(false);
  };

  const handleToggleCustom = () => {
    setCustomExpanded(!customExpanded);
    setSelectedId(null);
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

  const bridgeColor = brewParams?.teaColor || "#8C563E";
  const showBrewing = viewState === "enter-brewing" || viewState === "brewing" || viewState === "exit-brewing";

  const selectedTea = selectedId ? getTeaById(selectedId) ?? null : null;

  return (
    <div className="relative min-h-[100dvh]">
      {/* ─── Bridge overlay ─── */}
      {(viewState === "enter-brewing" || viewState === "exit-brewing") && (
        <div
          className={`fixed inset-0 pointer-events-none ${viewState === "exit-brewing" ? "bridge-overlay-slow" : "bridge-overlay"}`}
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
              : viewState === "brewing"
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
                teas={teas}
                selectedId={selectedId}
                onSelect={handleSelect}
                selectedTea={selectedTea}
                aiExpanded={aiExpanded}
                onToggleAI={handleToggleAI}
                customExpanded={customExpanded}
                onToggleCustom={handleToggleCustom}
                vesselMl={vesselMl}
                onVesselChange={handleVesselChange}
                onStartBrewing={handleStartBrewing}
                onAIBrew={handleAIBrew}
              />
            </div>
            <div className="h-16" />
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
    </div>
  );
}
