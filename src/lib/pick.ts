/**
 * Pick an item from an array using a numeric seed.
 * Same seed + same array = same result.
 *
 * Uses a simple multiplicative hash to distribute sequential seeds
 * across different array indices.
 */
export function seededPick<T>(items: T[], seed: number): T {
  const hash = ((seed * 2654435761) >>> 0) % items.length;
  return items[hash];
}

/**
 * Session seed: timestamp floored to 30-minute windows.
 * Reopening within the same window gives the same seed.
 *
 * Used by headlines, weather moods, and other per-visit selections
 * that should remain stable across reloads within the same period.
 */
export function getSessionSeed(): number {
  const WINDOW_MS = 30 * 60 * 1000;
  return Math.floor(Date.now() / WINDOW_MS);
}
