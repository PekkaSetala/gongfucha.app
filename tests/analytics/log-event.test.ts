import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logEvent } from "@/lib/analytics/log-event";

describe("logEvent", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.useRealTimers();
  });

  it("emits one JSON line with ts and payload", () => {
    logEvent({ event: "identify.hit", query: "da hong pao", slug: "da-hong-pao", score: 5.2, latencyMs: 18 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed).toEqual({
      ts: "2026-04-19T10:00:00.000Z",
      event: "identify.hit",
      query: "da hong pao",
      slug: "da-hong-pao",
      score: 5.2,
      latencyMs: 18,
    });
  });

  it("does not emit when GFC_ANALYTICS_DISABLED=1", () => {
    process.env.GFC_ANALYTICS_DISABLED = "1";
    logEvent({ event: "identify.rate_limited" });
    expect(logSpy).not.toHaveBeenCalled();
    delete process.env.GFC_ANALYTICS_DISABLED;
  });
});
