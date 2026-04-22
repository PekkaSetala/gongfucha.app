import { describe, it, expect, vi, afterEach } from "vitest";
import { track } from "@/lib/analytics/track";

describe("track", () => {
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("is a no-op when window.umami is absent", () => {
    (globalThis as unknown as { window: object }).window = {};
    expect(() => track({ name: "tea_selected", teaSlug: "da-hong-pao", source: "list" })).not.toThrow();
  });

  it("calls umami.track with name and data stripped of name", () => {
    const spy = vi.fn();
    (globalThis as unknown as { window: { umami: { track: typeof spy } } }).window = { umami: { track: spy } };
    track({ name: "tea_selected", teaSlug: "long-jing", source: "ai" });
    expect(spy).toHaveBeenCalledWith("tea_selected", { teaSlug: "long-jing", source: "ai" });
  });

  it("swallows errors thrown by umami", () => {
    const boom = vi.fn(() => { throw new Error("blocked"); });
    (globalThis as unknown as { window: { umami: { track: typeof boom } } }).window = { umami: { track: boom } };
    expect(() => track({ name: "ai_query", latencyMs: 42 })).not.toThrow();
  });
});
