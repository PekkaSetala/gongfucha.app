"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseTimerOptions {
  durationSeconds: number;
  onComplete: () => void;
}

interface UseTimerReturn {
  secondsLeft: number;
  isRunning: boolean;
  progress: number; // 0 to 1
  play: () => void;
  pause: () => void;
  reset: (newDuration?: number) => void;
  adjust: (delta: number) => void;
}

export function useTimer({
  durationSeconds,
  onComplete,
}: UseTimerOptions): UseTimerReturn {
  const [activeDuration, setActiveDuration] = useState(durationSeconds);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Reset when the duration prop changes (render-time sync).
  if (activeDuration !== durationSeconds) {
    setActiveDuration(durationSeconds);
    setSecondsLeft(durationSeconds);
  }

  // Keep the latest onComplete callback without re-subscribing the interval.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(
    (newDuration?: number) => {
      clearTimer();
      setIsRunning(false);
      setActiveDuration((prev) => {
        const d = newDuration ?? prev;
        setSecondsLeft(d);
        return d;
      });
    },
    [clearTimer]
  );

  // Extends or shortens the current countdown by `delta` seconds without
  // restarting. activeDuration stays in sync so progress calculations remain
  // accurate. Minimum of 1 second on both to keep the ring visible.
  const adjust = useCallback((delta: number) => {
    setActiveDuration((prev) => Math.max(1, prev + delta));
    setSecondsLeft((prev) => Math.max(1, prev + delta));
  }, []);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, clearTimer]);

  const progress = activeDuration > 0 ? 1 - secondsLeft / activeDuration : 0;

  return { secondsLeft, isRunning, progress, play, pause, reset, adjust };
}
