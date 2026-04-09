"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Tea sounds used during a brewing session.
 *
 *  chime  — timer completion ping (fires 6–8 times per session)
 *  close  — ritual closure, plays once on "Yes, end session"
 *
 * Uses Web Audio API for low-latency playback with HTMLAudio fallback.
 * Handles iOS audio unlock on first user interaction.
 */
type CueName = "chime" | "close";

const CUE_FILES: Record<CueName, string> = {
  chime: "/sounds/ding.mp3",
  close: "/sounds/cup-and-saucer.mp3",
};

const CUE_GAIN: Record<CueName, number> = {
  chime: 0.28,
  close: 0.45,
};

// Module-level cache so decoded buffers and fallback elements survive across
// hook mounts (e.g. starting multiple brewing sessions in one page visit).
// Per-cue promise prevents concurrent decodes on fast remounts.
const bufferCache: Partial<Record<CueName, AudioBuffer>> = {};
const bufferPromises: Partial<Record<CueName, Promise<AudioBuffer | null>>> = {};
let fallbackCache: Partial<Record<CueName, HTMLAudioElement>> | null = null;

function loadBuffer(ctx: AudioContext, cue: CueName): Promise<AudioBuffer | null> {
  if (bufferCache[cue]) return Promise.resolve(bufferCache[cue]!);
  if (bufferPromises[cue]) return bufferPromises[cue]!;

  const p = fetch(CUE_FILES[cue])
    .then((res) => res.arrayBuffer())
    .then((buf) => ctx.decodeAudioData(buf))
    .then((decoded) => {
      bufferCache[cue] = decoded;
      return decoded;
    })
    .catch(() => null);

  bufferPromises[cue] = p;
  return p;
}

function getFallbacks(): Partial<Record<CueName, HTMLAudioElement>> {
  if (fallbackCache) return fallbackCache;
  fallbackCache = {};
  (Object.entries(CUE_FILES) as [CueName, string][]).forEach(([cue, url]) => {
    const audio = new Audio(url);
    audio.volume = CUE_GAIN[cue];
    fallbackCache![cue] = audio;
  });
  return fallbackCache;
}

export function useBrewSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      (Object.keys(CUE_FILES) as CueName[]).forEach((cue) => void loadBuffer(ctx, cue));
    }

    // Warm the fallback cache even if AudioContext is available — costs two
    // Audio allocations but guarantees playback if decode ever fails.
    getFallbacks();

    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  /**
   * Call on first user interaction to unlock iOS audio.
   * Safe to call multiple times — only acts once.
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }, []);

  const playCue = useCallback((cue: CueName) => {
    const ctx = ctxRef.current;
    const buffer = bufferCache[cue];

    if (ctx && buffer && ctx.state === "running") {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = CUE_GAIN[cue];
      source.connect(gain).connect(ctx.destination);
      source.start(0);
      return;
    }

    const fallback = getFallbacks()[cue];
    if (fallback) {
      fallback.currentTime = 0;
      fallback.play().catch(() => {});
    }
  }, []);

  /** Timer completion ping — fires once per infusion */
  const play = useCallback(() => playCue("chime"), [playCue]);

  /** Ritual closure — porcelain placement on "Yes, end session" */
  const playClose = useCallback(() => playCue("close"), [playCue]);

  return { play, playClose, unlock };
}
