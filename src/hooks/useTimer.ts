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
}

export function useTimer({
  durationSeconds,
  onComplete,
}: UseTimerOptions): UseTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const durationRef = useRef(durationSeconds);

  onCompleteRef.current = onComplete;
  durationRef.current = durationSeconds;

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
      const d = newDuration ?? durationRef.current;
      durationRef.current = d;
      setSecondsLeft(d);
    },
    [clearTimer]
  );

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

  // Reset when duration prop changes
  useEffect(() => {
    setSecondsLeft(durationSeconds);
    durationRef.current = durationSeconds;
  }, [durationSeconds]);

  const progress =
    durationRef.current > 0
      ? 1 - secondsLeft / durationRef.current
      : 0;

  return { secondsLeft, isRunning, progress, play, pause, reset };
}
