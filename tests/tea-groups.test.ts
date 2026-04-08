import { describe, it, expect } from "vitest";
import { teaGroups, getTeaById, type TeaGroup } from "@/data/teas";

describe("teaGroups", () => {
  it("has exactly 5 entries", () => {
    expect(teaGroups).toHaveLength(5);
  });

  it("has green and black as standalone strings", () => {
    expect(teaGroups[0]).toBe("green");
    expect(teaGroups[4]).toBe("black");
  });

  it("has white, oolong, puerh as group objects", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.id)).toEqual(["white", "oolong", "puerh"]);
  });

  it("all variant IDs reference existing presets", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    for (const group of groups) {
      for (const variantId of group.variants) {
        expect(getTeaById(variantId)).toBeDefined();
      }
    }
  });

  it("all standalone IDs reference existing presets", () => {
    const standalones = teaGroups.filter(
      (g): g is string => typeof g === "string"
    );
    for (const id of standalones) {
      expect(getTeaById(id)).toBeDefined();
    }
  });

  it("variantLabels length matches variants length", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    for (const group of groups) {
      expect(group.variantLabels).toHaveLength(group.variants.length);
    }
  });

  it("displayTempC matches the lower variant temp", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    for (const group of groups) {
      const temps = group.variants.map((id) => getTeaById(id)!.tempC);
      expect(group.displayTempC).toBe(Math.min(...temps));
    }
  });
});
