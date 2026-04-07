"use client";

interface SessionSummaryProps {
  teaName: string;
  teaColor: string;
  infusionsCompleted: number;
  totalTimeSeconds: number;
  leafG: number;
  vesselMl: number;
  onDone: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function SessionSummary({
  teaName,
  teaColor,
  infusionsCompleted,
  totalTimeSeconds,
  leafG,
  vesselMl,
  onDone,
}: SessionSummaryProps) {
  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden paper-texture"
      style={{
        "--tea-accent": teaColor,
        background: `linear-gradient(to bottom, var(--tea-accent-soft), transparent 40%), var(--color-bg)`,
      } as React.CSSProperties}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="phase-enter flex flex-col items-center w-full max-w-[320px]">
          <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-3">
            Session complete
          </p>
          <h1
            className="text-xl font-normal font-serif-cn mb-8"
            style={{ color: teaColor }}
          >
            {teaName}
          </h1>

          <div className="bg-surface/60 border border-border/50 rounded-xl px-6 py-5 w-full mb-8">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div className="text-center">
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Infusions</span>
                <span className="text-[16px] font-medium text-primary">{infusionsCompleted}</span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Total time</span>
                <span className="text-[16px] font-medium text-primary">{formatTime(totalTimeSeconds)}</span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Leaf</span>
                <span className="text-[16px] font-medium text-primary">{leafG}g</span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Vessel</span>
                <span className="text-[16px] font-medium text-primary">{vesselMl}ml</span>
              </div>
            </div>
          </div>

          <button
            onClick={onDone}
            className="w-full py-4 rounded-[14px] font-medium text-base shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.1)]"
            style={{
              backgroundColor: teaColor,
              color: "var(--color-surface)",
              transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
