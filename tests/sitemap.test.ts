import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

// Guards the TODO at src/app/corpus/page.tsx: /corpus must stay out of
// the sitemap until github.com/PekkaSetala/gongfucha-corpus is live.
// Indexing it prematurely would surface a Dataset JSON-LD distribution
// URL that 404s. Delete this test once the TODO is resolved and /corpus
// is meant to be public.
describe("sitemap", () => {
  const entries = sitemap();

  it("omits /corpus", () => {
    const corpusEntry = entries.find((e) => e.url.endsWith("/corpus"));
    expect(corpusEntry).toBeUndefined();
  });

  it("includes the home, brewing, teas, and methodology top-level pages", () => {
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/brewing"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/teas"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/about/methodology"))).toBe(true);
  });

  it("emits one entry per corpus tea under /tea/[slug]", () => {
    const teaEntries = entries.filter((e) => e.url.includes("/tea/"));
    // Corpus has 84 entries; the sitemap should mirror that.
    expect(teaEntries.length).toBeGreaterThanOrEqual(80);
  });
});
