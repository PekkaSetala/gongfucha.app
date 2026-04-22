export type IdentifyLogEvent =
  | { event: "identify.hit";           query: string; slug: string; score: number; latencyMs: number }
  | { event: "identify.llm";           query: string; latencyMs: number }
  | { event: "identify.rate_limited" }
  | { event: "identify.invalid";       reason: "empty" | "too_long" | "wrong_type" }
  | { event: "identify.error";         stage: "rag" | "llm" };

export function logEvent(payload: IdentifyLogEvent): void {
  if (process.env.GFC_ANALYTICS_DISABLED === "1") return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...payload }));
}
