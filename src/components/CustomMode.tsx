"use client";

import { useState, useMemo } from "react";
import { StepperControl } from "./StepperControl";
import type { BrewParams } from "./BrewingTimer";

type RinseMode = "none" | "once" | "twice";
type ExtensionCurve = "gentle" | "standard" | "steep";

const EXTENSION_FACTORS: Record<ExtensionCurve, number> = {
  gentle: 1.15,
  standard: 1.35,
  steep: 1.5,
};

interface CustomModeProps {
  vesselMl: number;
  onStartBrewing: (params: BrewParams) => void;
}

const pillBtn = (active: boolean) =>
  `flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
    active
      ? "border-clay bg-clay-soft text-clay"
      : "border-border bg-surface text-secondary"
  }`;

export function CustomMode({ vesselMl, onStartBrewing }: CustomModeProps) {
  const [baseTime, setBaseTime] = useState(10);
  const [infusions, setInfusions] = useState(8);
  const [rinseMode, setRinseMode] = useState<RinseMode>("none");
  const [curve, setCurve] = useState<ExtensionCurve>("standard");

  const leafG = Math.round(vesselMl * 0.06 * 10) / 10;
  const factor = EXTENSION_FACTORS[curve];

  const schedule = useMemo(() => {
    const s: number[] = [baseTime];
    for (let i = 1; i < infusions; i++) {
      s.push(Math.round(s[i - 1] * factor));
    }
    return s;
  }, [baseTime, infusions, factor]);

  const handleStart = () => {
    const params: BrewParams = {
      teaId: "custom",
      teaName: "Custom Tea",
      teaColor: undefined,
      tempC: 95,
      vesselMl,
      recommendedLeaf: leafG,
      actualLeaf: leafG,
      rinse: rinseMode !== "none",
      doubleRinse: rinseMode === "twice",
      schedule,
      scheduleAdjusted: false,
      brewNote: "",
    };
    onStartBrewing(params);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <StepperControl
          label="Base steep"
          value={`${baseTime}s`}
          onDecrement={() => setBaseTime(Math.max(3, baseTime - 2))}
          onIncrement={() => setBaseTime(Math.min(120, baseTime + 2))}
          decrementDisabled={baseTime <= 3}
          incrementDisabled={baseTime >= 120}
          decrementLabel="Decrease base steep time"
          incrementLabel="Increase base steep time"
          decrementText="-2"
          incrementText="+2"
        />
        <StepperControl
          label="Infusions"
          value={`${infusions}`}
          onDecrement={() => setInfusions(Math.max(1, infusions - 1))}
          onIncrement={() => setInfusions(Math.min(20, infusions + 1))}
          decrementDisabled={infusions <= 1}
          incrementDisabled={infusions >= 20}
          decrementLabel="Decrease number of infusions"
          incrementLabel="Increase number of infusions"
        />
      </div>

      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
          Rinse
        </span>
        <div className="flex gap-1.5">
          {(["none", "once", "twice"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setRinseMode(mode)}
              aria-pressed={rinseMode === mode}
              className={pillBtn(rinseMode === mode)}
            >
              {mode === "none" ? "None" : mode === "once" ? "Once" : "Twice"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
          Extension curve
        </span>
        <div className="flex gap-1.5">
          {(["gentle", "standard", "steep"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurve(c)}
              aria-pressed={curve === c}
              className={pillBtn(curve === c)}
            >
              <span className="block capitalize">{c}</span>
              <span className="block text-[10px] opacity-60">{EXTENSION_FACTORS[c]}x</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2.5">
          Infusion schedule (seconds)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {schedule.map((s, i) => (
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

      <button
        onClick={handleStart}
        className="w-full py-4 rounded-[14px] bg-clay text-surface font-medium text-[15px] mt-1 hover:bg-clay-hover shadow-[0_2px_8px_rgba(122,74,53,0.25)]"
        style={{ transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out), box-shadow 150ms var(--ease-out)" }}
      >
        Start Brewing
      </button>
    </div>
  );
}
