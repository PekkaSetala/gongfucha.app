// src/lib/rag/point-id.ts
// Qdrant only accepts unsigned ints or UUIDs as point IDs. Corpus IDs are
// slugs ("ali-shan"), so we derive a deterministic UUID from the slug via
// SHA-1. Stable across re-indexes; the original slug is kept in payload.

import { createHash } from "crypto";

export function slugToPointId(slug: string): string {
  const h = createHash("sha1").update(slug).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
