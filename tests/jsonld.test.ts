import { describe, it, expect } from "vitest";
import {
  buildPerson,
  buildOrganization,
  buildWebSite,
  buildBreadcrumbs,
  buildArticle,
  buildTechArticle,
  buildDataset,
} from "@/lib/jsonld";
import type { TeaEntry } from "@/data/corpus/schema";

const sampleEntry: TeaEntry = {
  id: "da-hong-pao",
  name: "Da Hong Pao",
  aliases: ["大红袍", "DHP"],
  category: "oolong",
  subcategory: "Yan Cha",
  region: "Wuyishan, Fujian, China",
  processing: ["withered", "oxidized", "roasted"],
  oxidation: "medium",
  roast: "heavy",
  flavor_profile: "Mineral, dark chocolate, roasted almonds. The hallmark yan yun.",
  tasting_notes: "Most DHP is a blend. Char and cocoa first, then plum.",
  body: "full",
  aroma_notes: ["roasted nuts"],
  taste_notes: ["mineral"],
  brewing: {
    temp_c: 100,
    ratio_g_per_100ml: 6,
    schedule_s: [10, 10, 12],
    max_infusions: 8,
    rinse: true,
  },
  beginner_friendly: true,
  sources: ["https://example.com"],
  updated: "2026-04-08",
};

describe("jsonld builders", () => {
  it("buildPerson has Person type and sameAs", () => {
    const p = buildPerson();
    expect(p["@context"]).toBe("https://schema.org");
    expect(p["@type"]).toBe("Person");
    expect(p.name).toBe("Pekka Setälä");
    expect(p.sameAs.length).toBeGreaterThanOrEqual(2);
  });

  it("buildOrganization carries founder Person", () => {
    const o = buildOrganization();
    expect(o["@type"]).toBe("Organization");
    expect(o.founder.name).toBe("Pekka Setälä");
  });

  it("buildWebSite is well-formed", () => {
    const w = buildWebSite();
    expect(w["@type"]).toBe("WebSite");
    expect(w.publisher.name).toBe("Pekka Setälä");
  });

  it("buildBreadcrumbs makes absolute URLs", () => {
    const b = buildBreadcrumbs([
      { name: "Home", url: "/" },
      { name: "Teas", url: "/teas" },
    ]);
    expect(b["@type"]).toBe("BreadcrumbList");
    expect(b.itemListElement).toHaveLength(2);
    expect(b.itemListElement[0].position).toBe(1);
    expect(String(b.itemListElement[0].item)).toMatch(/^https?:\/\//);
  });

  it("buildArticle has required Article fields", () => {
    const a = buildArticle({
      headline: "Test",
      description: "desc",
      url: "/brewing",
      datePublished: "2026-04-14",
      dateModified: "2026-04-14",
    });
    expect(a["@type"]).toBe("Article");
    expect(a.author.name).toBe("Pekka Setälä");
    expect(String(a.mainEntityOfPage)).toMatch(/\/brewing$/);
  });

  it("buildTechArticle includes about + Wikidata sameAs when known", () => {
    const t = buildTechArticle(sampleEntry);
    expect(t["@type"]).toBe("TechArticle");
    expect(t.headline).toContain("Da Hong Pao");
    expect(t.articleSection).toBe("Oolong");
    const about = t.about as { sameAs?: string[] };
    expect(about.sameAs?.[0]).toMatch(/wikidata\.org/);
  });

  it("buildDataset has CC-BY license and variableMeasured", () => {
    const d = buildDataset({ url: "/corpus", entryCount: 84 });
    expect(d["@type"]).toBe("Dataset");
    expect(d.license).toContain("creativecommons.org");
    expect(d.variableMeasured.length).toBeGreaterThan(5);
  });
});
