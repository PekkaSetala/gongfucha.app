"use client";

import { useState, useEffect } from "react";
import { getTeas, getTeaById } from "@/data/teas";
import { Header } from "@/components/Header";
import { TeaList } from "@/components/TeaList";
import { TeaDetail } from "@/components/TeaDetail";
import { SecondaryPaths } from "@/components/SecondaryPaths";
import { BrewingTimer } from "@/components/BrewingTimer";
import { AIAdvisor } from "@/components/AIAdvisor";
import type { AIResult } from "@/components/AIAdvisor";
import { CustomMode } from "@/components/CustomMode";
import { InlineViewHeader } from "@/components/InlineViewHeader";
import type { BrewParams } from "@/components/BrewingTimer";

type View = "list" | "ai" | "custom";

const VESSEL_KEY = "gongfucha-vessel-ml";
const DEFAULT_VESSEL = 120;

function getStoredVessel(): number {
  if (typeof window === "undefined") return DEFAULT_VESSEL;
  const stored = localStorage.getItem(VESSEL_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_VESSEL;
}

export default function Home() {
  const teas = getTeas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vesselMl, setVesselMl] = useState(DEFAULT_VESSEL);
  const [brewParams, setBrewParams] = useState<BrewParams | null>(null);
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    setVesselMl(getStoredVessel());
  }, []);

  useEffect(() => {
    if (brewParams) {
      document.title = `Brewing ${brewParams.teaName} — Gongfu Cha`;
    } else if (view === "ai") {
      document.title = "Ask AI — Gongfu Cha";
    } else if (view === "custom") {
      document.title = "Custom Brew — Gongfu Cha";
    } else {
      document.title = "Gongfu Cha";
    }
  }, [view, brewParams]);

  const handleVesselChange = (ml: number) => {
    setVesselMl(ml);
    localStorage.setItem(VESSEL_KEY, String(ml));
  };

  const handleSelect = (id: string) => {
    setSelectedId(selectedId === id ? null : id);
  };

  const handleStartBrewing = (params: BrewParams) => {
    setBrewParams(params);
    setView("list");
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
    handleStartBrewing({
      teaId: "ai-identified",
      teaName: result.teaName,
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
    setBrewParams(null);
  };

  if (brewParams) {
    return <BrewingTimer params={brewParams} onEnd={handleEndBrewing} />;
  }

  const selectedTea = selectedId ? getTeaById(selectedId) : null;

  return (
    <main id="main-content" className="flex-1">
      <div className="max-w-[800px] mx-auto min-h-screen">
        <Header />

        <div className="flex gap-6 items-start">
          {/* Main column */}
          <div className={`flex-1 min-w-0 ${view === "list" ? "md:max-w-[420px]" : "md:max-w-[560px]"}`}>
            <div className={view !== "list" ? "hidden" : ""}>
                <TeaList
                  teas={teas}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />

                {/* Mobile: inline detail */}
                {selectedTea && (
                  <div className="md:hidden mt-2">
                    <TeaDetail
                      tea={selectedTea}
                      vesselMl={vesselMl}
                      onVesselChange={handleVesselChange}
                      onStartBrewing={handleStartBrewing}
                      variant="inline"
                    />
                  </div>
                )}

                <SecondaryPaths
                  onOpenAI={() => { setSelectedId(null); setView("ai"); }}
                  onOpenCustom={() => { setSelectedId(null); setView("custom"); }}
                />
            </div>

            {view === "ai" && (
              <div className="px-5 view-enter">
                <InlineViewHeader
                  title="Ask AI"
                  onBack={() => setView("list")}
                />
                <AIAdvisor
                  vesselMl={vesselMl}
                  onVesselChange={handleVesselChange}
                  onStartBrewing={handleAIBrew}
                />
              </div>
            )}

            {view === "custom" && (
              <div className="px-5 view-enter">
                <InlineViewHeader
                  title="Custom Brew"
                  onBack={() => setView("list")}
                />
                <CustomMode vesselMl={vesselMl} onStartBrewing={handleStartBrewing} />
              </div>
            )}
          </div>

          {/* Desktop: side panel */}
          {view === "list" && (
          <div className="hidden md:block sticky top-6 w-[340px] shrink-0 pr-2">
            {selectedTea ? (
              <TeaDetail
                tea={selectedTea}
                vesselMl={vesselMl}
                onVesselChange={handleVesselChange}
                onStartBrewing={handleStartBrewing}
                variant="panel"
              />
            ) : (
              <div className="bg-surface border border-border rounded-[14px] p-7 flex flex-col items-center justify-center h-[300px] text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-border-hover)" strokeWidth="1.2" strokeLinecap="round" className="mb-4" aria-hidden="true">
                  <path d="M4 6h12a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4H4V6z" />
                  <path d="M16 9h2a2 2 0 0 1 0 4h-2" />
                  <line x1="4" y1="13" x2="4" y2="16" />
                  <path d="M6 16h8" />
                </svg>
                <p className="text-tertiary text-[13px]">
                  Pick a tea to get started
                </p>
              </div>
            )}
          </div>
          )}
        </div>

        <div className="h-16" />
      </div>
    </main>
  );
}
