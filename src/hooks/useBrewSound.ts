"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Hook that plays a completion sound using Web Audio API.
 * Handles iOS audio unlock on first user interaction.
 * Falls back to HTMLAudioElement if AudioContext is unavailable.
 */
export function useBrewSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const unlockedRef = useRef(false);
  const fallbackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Try AudioContext first
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      fetch("/sounds/ceramic-tap.wav")
        .then((res) => res.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          bufferRef.current = decoded;
        })
        .catch(() => {
          // Fall back to HTML audio
          ctxRef.current = null;
        });
    }

    // Always prepare fallback
    const audio = new Audio("/sounds/ceramic-tap.wav");
    audio.volume = 0.25;
    fallbackRef.current = audio;

    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      bufferRef.current = null;
      if (fallbackRef.current) {
        fallbackRef.current.pause();
        fallbackRef.current.src = "";
        fallbackRef.current = null;
      }
    };
  }, []);

  /**
   * Call on first user interaction (e.g. play button) to unlock
   * iOS audio context. Safe to call multiple times — only acts once.
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;

    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }, []);

  /**
   * Play the completion sound.
   */
  const play = useCallback(() => {
    const ctx = ctxRef.current;
    const buffer = bufferRef.current;

    if (ctx && buffer && ctx.state === "running") {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      source.connect(gain).connect(ctx.destination);
      source.start(0);
      return;
    }

    // Fallback
    if (fallbackRef.current) {
      fallbackRef.current.currentTime = 0;
      fallbackRef.current.play().catch(() => {});
    }
  }, []);

  return { play, unlock };
}
