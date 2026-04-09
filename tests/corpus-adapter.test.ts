import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { corpusEntryToTeaPreset } from "@/lib/corpus-adapter";
import type { TeaEntry } from "@/data/corpus/schema";
import longJingEntry from "@/data/corpus/entries/long-jing.json";

const ENTRIES_DIR = path.resolve(
  __dirname,
  "../src/data/corpus/entries"
);

describe("corpusEntryToTeaPreset", () => {
  it("converts Long Jing correctly (unit conversion fixture)", () => {
    const preset = corpusEntryToTeaPreset(longJingEntry as TeaEntry);

    // Identity
    expect(preset.id).toBe("long-jing");
    expect(preset.name).toBe("Long Jing");

    // Brewing-critical (must match the corpus JSON exactly)
    expect(preset.tempC).toBe(80);
    expect(preset.ratioGPerMl).toBeCloseTo(0.04, 5); // 4 g/100ml / 100
    expect(preset.rinse).toBe(false);
    expect(preset.baselineSchedule).toEqual([25, 20, 20, 30, 45]);

    // Derived
    expect(preset.doubleRinse).toBe(false);
    expect(preset.color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(preset.subtitle).toBe("Green tea");
    expect(preset.maxAdjust).toBeGreaterThan(0);
    expect(preset.seasons.length).toBeGreaterThan(0);
    expect(preset.brewNote.length).toBeGreaterThan(0);
  });

  it("runs over every corpus entry without throwing", () => {
    const files = readdirSync(ENTRIES_DIR).filter(
      (f) => f.endsWith(".json") && f !== "index.json"
    );
    expect(files.length).toBeGreaterThanOrEqual(80);

    for (const file of files) {
      const entry = JSON.parse(
        readFileSync(path.join(ENTRIES_DIR, file), "utf8")
      ) as TeaEntry;

      const preset = corpusEntryToTeaPreset(entry);

      // Every required TeaPreset field is present and sensible
      expect(preset.id).toBe(entry.id);
      expect(preset.name).toBe(entry.name);
      expect(preset.tempC).toBe(entry.brewing.temp_c);
      expect(preset.ratioGPerMl).toBeCloseTo(
        entry.brewing.ratio_g_per_100ml / 100,
        5
      );
      expect(preset.rinse).toBe(entry.brewing.rinse);
      expect(preset.baselineSchedule).toEqual(entry.brewing.schedule_s);
      expect(preset.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(preset.maxAdjust).toBeGreaterThan(0);
      expect(Array.isArray(preset.seasons)).toBe(true);
      expect(preset.brewNote.length).toBeGreaterThan(0);
    }
  });
});
