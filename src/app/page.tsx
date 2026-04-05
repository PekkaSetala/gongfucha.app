"use client";

import { useState, useEffect } from "react";
import { getTeas, getTeaById } from "@/data/teas";
import { Header } from "@/components/Header";
import { TeaList } from "@/components/TeaList";
import { TeaDetail } from "@/components/TeaDetail";
import { SecondaryPaths } from "@/components/SecondaryPaths";
import { BrewingTimer } from "@/components/BrewingTimer";
import { AIAdvisor } from "@/components/AIAdvisor";
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
    result: {
      teaName: string;
      category: string;
      tempC: number;
      ratioGPerMl: number;
      rinse: boolean;
      schedule: number[];
      summary: string;
    },
    aiVesselMl: number
  ) => {
    const leaf = Math.round(result.ratioGPerMl * aiVesselMl * 10) / 10;
    handleStartBrewing({
      teaId: "ai-identified",
      teaName: result.teaName,
      tempC: result.tempC,
      vesselMl: aiVesselMl,
      recommendedLeaf: leaf,
      actualLeaf: leaf,
      rinse: result.rinse,
      doubleRinse: false,
      schedule: result.schedule,
      scheduleAdjusted: false,
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
    <div className="flex-1">
      <div className="max-w-[800px] mx-auto min-h-screen">
        <Header />

        <div className="flex gap-6 items-start">
          {/* Main column */}
          <div className="flex-1 min-w-0 md:max-w-[420px]">
            {view === "list" && (
              <>
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
                  onOpenAI={() => setView("ai")}
                  onOpenCustom={() => setView("custom")}
                />
              </>
            )}

            {view === "ai" && (
              <div className="px-5">
                <InlineViewHeader
                  title="Ask AI"
                  onBack={() => setView("list")}
                />
                <AIAdvisor onStartBrewing={handleAIBrew} />
              </div>
            )}

            {view === "custom" && (
              <div className="px-5">
                <InlineViewHeader
                  title="Custom brew"
                  onBack={() => setView("list")}
                />
                <CustomMode vesselMl={vesselMl} onStartBrewing={handleStartBrewing} />
              </div>
            )}
          </div>

          {/* Desktop: side panel */}
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
              <div className="bg-surface border border-border rounded-[18px] p-7 flex items-center justify-center h-[300px]">
                <p className="text-tertiary text-sm italic">
                  Select a tea to see details
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="h-16" />
      </div>
    </div>
  );
}
