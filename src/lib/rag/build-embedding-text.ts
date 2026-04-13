import type { TeaEntry } from "@/data/corpus/schema";

/**
 * Builds the string that gets vectorized for a tea entry.
 *
 * Includes identity, origin, processing characteristics, and flavor fields.
 * Structured fields (temp, ratios, schedule) stay as Qdrant payload — not embedded.
 * Omits undefined optional fields so no literal "undefined" appears in the vector.
 */
export function buildEmbeddingText(entry: TeaEntry): string {
  const parts: string[] = [
    entry.name,
  ];

  const aliasText = entry.aliases.join(" ");
  if (aliasText) parts.push(aliasText);

  if (entry.subcategory) {
    parts.push(entry.subcategory);
  }

  parts.push(entry.region);

  const processingParts: string[] = [`${entry.oxidation} oxidation`];
  if (entry.roast && entry.roast !== "none") {
    processingParts.push(`${entry.roast} roast`);
  }
  if (entry.aging?.viable) {
    processingParts.push("aging-viable");
  }
  parts.push(processingParts.join(", "));

  parts.push(entry.flavor_profile);
  parts.push(entry.tasting_notes);

  if (entry.brewing.tips) {
    parts.push(entry.brewing.tips);
  }

  parts.push(entry.aroma_notes.join(" "));
  parts.push(entry.taste_notes.join(" "));

  return parts.join(" ");
}
