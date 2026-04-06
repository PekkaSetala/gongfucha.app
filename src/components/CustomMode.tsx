"use client";

import { useState } from "react";
import type { BrewParams } from "./BrewingTimer";

interface CustomModeProps {
  vesselMl: number;
  onStartBrewing: (params: BrewParams) => void;
}

export function CustomMode({ vesselMl, onStartBrewing }: CustomModeProps) {
  const [name, setName] = useState("");
  const [temp, setTemp] = useState(95);
  const [vessel, setVessel] = useState(vesselMl);
  const [leaf, setLeaf] = useState(6);
  const [rinse, setRinse] = useState(false);
  const [baseTime, setBaseTime] = useState(10);
  const [infusions, setInfusions] = useState(8);

  const generateSchedule = (): number[] => {
    const schedule: number[] = [baseTime];
    for (let i = 1; i < infusions; i++) {
      schedule.push(Math.round(schedule[i - 1] * 1.35));
    }
    return schedule;
  };

  const handleStart = () => {
    const params: BrewParams = {
      teaId: "custom",
      teaName: name || "Custom Tea",
      tempC: temp,
      vesselMl: vessel,
      recommendedLeaf: leaf,
      actualLeaf: leaf,
      rinse,
      doubleRinse: false,
      schedule: generateSchedule(),
      scheduleAdjusted: false,
      brewNote: "",
    };
    onStartBrewing(params);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus-visible:outline-none focus-visible:border-clay transition-colors duration-150";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="custom-tea-name" className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
          Tea name
        </label>
        <input
          id="custom-tea-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you brewing?"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="custom-temp" className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Temperature (°C)
          </label>
          <input
            id="custom-temp"
            type="number"
            value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            min={60}
            max={100}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="custom-vessel" className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Vessel (ml)
          </label>
          <input
            id="custom-vessel"
            type="number"
            value={vessel}
            onChange={(e) => setVessel(Number(e.target.value))}
            min={40}
            max={300}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="custom-leaf" className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Leaf (g)
          </label>
          <input
            id="custom-leaf"
            type="number"
            value={leaf}
            onChange={(e) => setLeaf(Number(e.target.value))}
            min={1}
            max={30}
            step={0.5}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="custom-base-time" className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Base steep (seconds)
          </label>
          <input
            id="custom-base-time"
            type="number"
            value={baseTime}
            onChange={(e) => setBaseTime(Number(e.target.value))}
            min={3}
            max={120}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="custom-infusions" className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Infusions
          </label>
          <input
            id="custom-infusions"
            type="number"
            value={infusions}
            onChange={(e) => setInfusions(Number(e.target.value))}
            min={1}
            max={20}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Rinse
          </label>
          <button
            onClick={() => setRinse(!rinse)}
            aria-pressed={rinse}
            aria-label="Include rinse step"
            className={`w-full px-4 py-3 rounded-xl border text-[14px] font-medium transition-colors duration-150 ${
              rinse
                ? "border-clay bg-clay-soft text-clay"
                : "border-border bg-surface text-secondary"
            }`}
          >
            {rinse ? "Yes" : "No"}
          </button>
        </div>
      </div>

      <button
        onClick={handleStart}
        className="w-full py-4 rounded-[14px] bg-clay text-surface font-medium text-[15px] mt-2 transition-colors duration-150 hover:bg-clay-hover"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        Start Brewing
      </button>
    </div>
  );
}
