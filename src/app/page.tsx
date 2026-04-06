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
import { getTeaColor } from "@/data/tea-categories";

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
    setBrewParams(null);
  };

  if (brewParams) {
    return <BrewingTimer params={brewParams} onEnd={handleEndBrewing} />;
  }

  const selectedTea = selectedId ? getTeaById(selectedId) : null;

  return (
    <main id="main-content" className="flex-1">
      <div className="max-w-[680px] mx-auto min-h-screen">
        <Header />

        {view === "list" ? (
          <div className="max-w-[680px] mx-auto">
            <TeaList
              teas={teas}
              selectedId={selectedId}
              onSelect={handleSelect}
            />

            {selectedTea && (
              <div className="mt-2">
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
        ) : (
          <div className="max-w-[680px] mx-auto">
            {view === "ai" && (
              <div className="px-5 md:px-0 view-enter">
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
              <div className="px-5 md:px-0 view-enter">
                <InlineViewHeader
                  title="Custom Brew"
                  onBack={() => setView("list")}
                />
                <CustomMode vesselMl={vesselMl} onStartBrewing={handleStartBrewing} />
              </div>
            )}
          </div>
        )}

        <div className="h-16" />
      </div>
    </main>
  );
}
