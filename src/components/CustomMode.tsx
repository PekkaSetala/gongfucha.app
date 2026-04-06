"use client";

import { useState } from "react";
import { StepperControl } from "./StepperControl";
import type { BrewParams } from "./BrewingTimer";

interface CustomModeProps {
  vesselMl: number;
  onStartBrewing: (params: BrewParams) => void;
}

const TEMP_PRESETS = [80, 85, 90, 95, 100] as const;

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

  return (
    <div className="flex flex-col gap-5">
      {/* Tea name */}
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
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus-visible:outline-none focus-visible:border-clay transition-colors duration-150"
        />
      </div>

      {/* Temperature — segmented presets */}
      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
          Temperature
        </span>
        <div className="flex gap-1.5">
          {TEMP_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => setTemp(t)}
              aria-pressed={temp === t}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
                temp === t
                  ? "border-clay bg-clay-soft text-clay"
                  : "border-border bg-surface text-secondary"
              }`}
            >
              {t}°
            </button>
          ))}
        </div>
      </div>

      {/* Vessel & Leaf — steppers */}
      <div className="grid grid-cols-2 gap-4">
        <StepperControl
          label="Vessel"
          value={`${vessel}ml`}
          onDecrement={() => setVessel(Math.max(40, vessel - 10))}
          onIncrement={() => setVessel(Math.min(300, vessel + 10))}
          decrementDisabled={vessel <= 40}
          incrementDisabled={vessel >= 300}
          decrementLabel="Decrease vessel size"
          incrementLabel="Increase vessel size"
        />
        <StepperControl
          label="Leaf"
          value={`${leaf}g`}
          onDecrement={() => setLeaf(Math.max(0.5, Math.round((leaf - 0.5) * 10) / 10))}
          onIncrement={() => setLeaf(Math.min(30, Math.round((leaf + 0.5) * 10) / 10))}
          decrementDisabled={leaf <= 0.5}
          incrementDisabled={leaf >= 30}
          decrementLabel="Decrease leaf amount"
          incrementLabel="Increase leaf amount"
        />
      </div>

      {/* Base steep & Infusions — steppers */}
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
          decrementText="−2"
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

      {/* Rinse toggle */}
      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
          Rinse
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setRinse(false)}
            aria-pressed={!rinse}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
              !rinse
                ? "border-clay bg-clay-soft text-clay"
                : "border-border bg-surface text-secondary"
            }`}
          >
            No rinse
          </button>
          <button
            onClick={() => setRinse(true)}
            aria-pressed={rinse}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
              rinse
                ? "border-clay bg-clay-soft text-clay"
                : "border-border bg-surface text-secondary"
            }`}
          >
            Rinse
          </button>
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
