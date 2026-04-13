// Server-only loader. Never import from a "use client" component —
// the fs read happens at build / request time on the server.
import fs from "node:fs";
import path from "node:path";
import type { TeaEntry } from "./schema";

const ENTRIES_DIR = path.join(process.cwd(), "src/data/corpus/entries");

let cached: TeaEntry[] | null = null;

export function getAllEntries(): TeaEntry[] {
  if (cached) return cached;
  const files = fs.readdirSync(ENTRIES_DIR).filter((f) => f.endsWith(".json"));
  cached = files
    .map((f) => JSON.parse(fs.readFileSync(path.join(ENTRIES_DIR, f), "utf8")) as TeaEntry)
    .sort((a, b) => a.id.localeCompare(b.id));
  return cached;
}

export function getEntryById(id: string): TeaEntry | undefined {
  return getAllEntries().find((e) => e.id === id);
}
