type UmamiWindow = Window & {
  umami?: { track: (name: string, data?: Record<string, unknown>) => void };
};

export type TrackEvent =
  | { name: "tea_selected";   teaSlug: string; source: "list" | "ai" | "custom" }
  | { name: "brew_started";   teaSlug: string; leafG: number; vesselMl: number; ratioG100ml: number }
  | { name: "brew_completed"; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "brew_aborted";   teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "ai_query";       latencyMs: number };

export function track(event: TrackEvent): void {
  if (typeof window === "undefined") return;
  const umami = (window as UmamiWindow).umami;
  if (!umami) return;
  const { name, ...data } = event;
  try {
    umami.track(name, data);
  } catch {
    /* best-effort; never throw into the app */
  }
}
