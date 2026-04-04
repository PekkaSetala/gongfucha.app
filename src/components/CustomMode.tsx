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
    "w-full px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus:outline-none focus:border-clay transition-colors duration-150";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
          Tea name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you brewing?"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Temperature (°C)
          </label>
          <input
            type="number"
            value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            min={60}
            max={100}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Vessel (ml)
          </label>
          <input
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
          <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Leaf (g)
          </label>
          <input
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
          <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Base steep (seconds)
          </label>
          <input
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
          <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Infusions
          </label>
          <input
            type="number"
            value={infusions}
            onChange={(e) => setInfusions(Number(e.target.value))}
            min={1}
            max={20}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
            Rinse
          </label>
          <button
            onClick={() => setRinse(!rinse)}
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
        className="w-full py-4 rounded-[14px] bg-clay text-[#FAF7F2] font-medium text-[15px] mt-2 transition-colors duration-150 hover:bg-clay-hover"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        Start Brewing
      </button>
    </div>
  );
}
