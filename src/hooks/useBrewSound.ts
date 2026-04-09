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

export function useBrewSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<CueName, AudioBuffer>>>({});
  const fallbackRef = useRef<Partial<Record<CueName, HTMLAudioElement>>>({});
  const unlockedRef = useRef(false);

  useEffect(() => {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      (Object.entries(CUE_FILES) as [CueName, string][]).forEach(([cue, url]) => {
        fetch(url)
          .then((res) => res.arrayBuffer())
          .then((buf) => ctx.decodeAudioData(buf))
          .then((decoded) => {
            buffersRef.current[cue] = decoded;
          })
          .catch(() => {
            // swallow — fallback will handle it
          });
      });
    }

    // HTMLAudio fallback per cue
    (Object.entries(CUE_FILES) as [CueName, string][]).forEach(([cue, url]) => {
      const audio = new Audio(url);
      audio.volume = CUE_GAIN[cue];
      fallbackRef.current[cue] = audio;
    });

    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      buffersRef.current = {};
      Object.values(fallbackRef.current).forEach((a) => {
        if (a) {
          a.pause();
          a.src = "";
        }
      });
      fallbackRef.current = {};
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
    const buffer = buffersRef.current[cue];

    if (ctx && buffer && ctx.state === "running") {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = CUE_GAIN[cue];
      source.connect(gain).connect(ctx.destination);
      source.start(0);
      return;
    }

    const fallback = fallbackRef.current[cue];
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
