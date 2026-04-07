"use client";

import { useWeatherMood } from "@/hooks/useWeatherMood";

export function Header() {
  const mood = useWeatherMood();

  return (
    <header className="px-5 pt-14">
      {/* ─── Brand mark ─── */}
      <h1 className="mb-1">
        <span className="block text-[42px] font-serif-cn font-normal leading-tight text-primary/80">
          功夫茶
        </span>
        <span className="block text-[12px] font-serif-cn tracking-[3.5px] uppercase text-tertiary/50 mt-1.5">
          Gongfu Cha
        </span>
      </h1>

      {/* ─── Weather mood ─── */}
      {mood && (
        <p className="text-[13px] text-tertiary italic leading-relaxed mt-4 view-enter">
          {mood}
        </p>
      )}

      {/* ─── Section label ─── */}
      <p className="text-[11px] text-tertiary/60 tracking-[1.5px] uppercase mt-8 mb-4">
        pick your tea
      </p>
    </header>
  );
}
