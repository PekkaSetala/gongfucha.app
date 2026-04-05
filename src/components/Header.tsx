"use client";

import { getCurrentSeason, getSeasonalHint } from "@/lib/seasons";

export function Header() {
  const season = getCurrentSeason();
  const hint = getSeasonalHint(season);

  return (
    <header className="px-5 pt-14 pb-6">
      <span className="block text-[14px] font-serif-cn font-normal tracking-[3px] uppercase text-tertiary mb-7">
        Gongfu Cha
      </span>
      <h1 className="text-[26px] font-light leading-tight mb-1.5">
        What are we <strong className="font-medium">brewing?</strong>
      </h1>
      <p className="text-[13px] text-tertiary italic">{hint}</p>
    </header>
  );
}
