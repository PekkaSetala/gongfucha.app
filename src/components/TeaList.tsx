"use client";

import type { TeaPreset } from "@/data/teas";
import { isInSeason } from "@/lib/seasons";

interface TeaListProps {
  teas: TeaPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TeaList({ teas, selectedId, onSelect }: TeaListProps) {
  return (
    <div className="flex flex-col gap-2 px-5">
      {teas.map((tea, index) => {
        const selected = tea.id === selectedId;
        const seasonal = isInSeason(tea);

        return (
          <button
            key={tea.id}
            onClick={() => onSelect(tea.id)}
            className={`
              tea-stagger hover-lift
              flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] text-left
              border bg-surface
              ${selected ? "border-clay shadow-[0_2px_12px_rgba(140,86,62,0.1)]" : "border-border"}
            `}
            style={{
              animationDelay: `${index * 40}ms`,
              transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out)",
            }}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: tea.color,
                transition: "transform 250ms var(--ease-out)",
                transform: selected ? "scale(1.3)" : "scale(1)",
              }}
            />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-[15px] font-serif-cn font-[450] text-primary">
                  {tea.name}
                </span>
                {seasonal && (
                  <span className="text-[9px] font-medium tracking-[0.5px] uppercase px-1.5 py-0.5 rounded bg-gold-soft text-gold">
                    In season
                  </span>
                )}
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
