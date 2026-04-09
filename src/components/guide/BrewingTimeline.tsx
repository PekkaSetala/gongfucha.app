"use client";

interface BrewingTimelineProps {
  tempC: number;
  ratioG100ml: number;
  scheduleSeconds: number[];
}

/**
 * Small SVG timeline rendering a gongfu brewing schedule.
 * Layout:
 *
 *   80°C  ·  4 g/100 ml
 *   ▭  ▭  ▭  ▭  ▭
 *   25  20  20  30  45
 *
 * Bar widths are proportional to steep seconds, with a minimum so
 * short flash-steeps remain visible. Purely presentational.
 */
export function BrewingTimeline({
  tempC,
  ratioG100ml,
  scheduleSeconds,
}: BrewingTimelineProps) {
  const total = scheduleSeconds.reduce((sum, s) => sum + s, 0) || 1;
  const GAP = 4;

  // Minimum visual width: 10% of the available row, so a 5s step is
  // still finger-sized next to a 60s step.
  const minPct = 10;
  const rawPcts = scheduleSeconds.map((s) => (s / total) * 100);
  const clampedPcts = rawPcts.map((p) => Math.max(p, minPct));
  // Normalise back to 100 after clamping
  const clampedTotal = clampedPcts.reduce((a, b) => a + b, 0);
  const finalPcts = clampedPcts.map((p) => (p / clampedTotal) * 100);

  return (
    <div className="w-full">
      {/* Header: temp · ratio */}
      <div className="flex items-center gap-2 text-[12px] text-tertiary mb-2 tracking-wide">
        <span>{tempC}°C</span>
        <span aria-hidden="true">·</span>
        <span>{ratioG100ml} g / 100 ml</span>
      </div>

      {/* Bar row */}
      <div
        className="flex items-stretch w-full h-[28px]"
        style={{ gap: `${GAP}px` }}
        role="img"
        aria-label={`Infusion schedule: ${scheduleSeconds.join(", ")} seconds`}
      >
        {scheduleSeconds.map((_s, i) => (
          <div
            key={i}
            className="rounded-[3px] bg-border/60"
            style={{ width: `${finalPcts[i]}%` }}
          />
        ))}
      </div>

      {/* Seconds labels */}
      <div
        className="flex w-full mt-1 text-[10px] text-tertiary/80 tabular-nums"
        style={{ gap: `${GAP}px` }}
      >
        {scheduleSeconds.map((s, i) => (
          <div
            key={i}
            className="text-center"
            style={{ width: `${finalPcts[i]}%` }}
          >
            {s}s
          </div>
        ))}
      </div>
    </div>
  );
}
