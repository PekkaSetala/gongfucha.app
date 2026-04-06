"use client";

import type { TeaPreset } from "@/data/teas";

interface TeaListProps {
  teas: TeaPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TeaList({ teas, selectedId, onSelect }: TeaListProps) {
  return (
    <div className="flex flex-col gap-2 px-5" role="group" aria-label="Tea selection">
      {teas.map((tea, index) => {
        const selected = tea.id === selectedId;
        return (
          <button
            key={tea.id}
            onClick={() => onSelect(tea.id)}
            aria-pressed={selected}
            className={`
              tea-stagger hover-lift
              flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] text-left
              border
              ${selected ? "border-clay/30 shadow-[0_2px_12px_rgba(140,86,62,0.08)]" : "border-border bg-surface"}
            `}
            style={{
              animationDelay: `${index * 40}ms`,
              transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out)",
              backgroundColor: selected ? `color-mix(in srgb, ${tea.color} 6%, var(--color-surface))` : undefined,
            }}
          >
            <span
              className="w-5 h-5 rounded-full shrink-0"
              style={{
                backgroundColor: tea.color,
                transition: "transform 250ms var(--ease-out), box-shadow 250ms var(--ease-out)",
                transform: selected ? "scale(1.15)" : "scale(1)",
                boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${tea.color} 20%, transparent)` : "none",
              }}
            />
            <span className="flex-1 min-w-0">
              <span className="text-[15px] font-serif-cn font-normal text-primary">
                {tea.name}
              </span>
              <span className="block text-[12px] text-tertiary mt-0.5 truncate">
                {tea.subtitle}
              </span>
            </span>
            <span className="text-[13px] font-medium text-secondary shrink-0">
              {tea.tempC}°C
            </span>
          </button>
        );
      })}
    </div>
  );
}
