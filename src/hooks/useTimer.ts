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

// Wall-clock driven countdown: store an absolute end timestamp and derive
// secondsLeft from Date.now(). Needed because mobile browsers throttle or
// freeze setInterval while the tab is hidden or the screen is off, so a
// naive decrement-per-tick countdown silently drifts past completion.
export function useTimer({
  durationSeconds,
  onComplete,
}: UseTimerOptions): UseTimerReturn {
  const [activeDuration, setActiveDuration] = useState(durationSeconds);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  if (activeDuration !== durationSeconds) {
    setActiveDuration(durationSeconds);
    setSecondsLeft(durationSeconds);
    endAtRef.current = null;
  }

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
    endAtRef.current = null;
  }, [clearTimer]);

  const reset = useCallback(
    (newDuration?: number) => {
      clearTimer();
      setIsRunning(false);
      endAtRef.current = null;
      setActiveDuration((prev) => {
        const d = newDuration ?? prev;
        setSecondsLeft(d);
        return d;
      });
    },
    [clearTimer]
  );

  const adjust = useCallback((delta: number) => {
    setActiveDuration((prev) => Math.max(1, prev + delta));
    if (endAtRef.current != null) {
      // Floor to 1s in the future so a negative delta can't fire onComplete.
      const minEnd = Date.now() + 1000;
      endAtRef.current = Math.max(minEnd, endAtRef.current + delta * 1000);
    } else {
      setSecondsLeft((prev) => Math.max(1, prev + delta));
    }
  }, []);

  // Shared "recompute from wall clock" step used by both the interval tick
  // and the visibilitychange handler that fires when the screen wakes.
  const tick = useCallback(() => {
    const endAt = endAtRef.current;
    if (endAt == null) return;
    const remainingMs = endAt - Date.now();
    const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
    setSecondsLeft((prev) => (prev === remaining ? prev : remaining));
    if (remaining <= 0) {
      endAtRef.current = null;
      clearTimer();
      setIsRunning(false);
      onCompleteRef.current();
    }
  }, [clearTimer]);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    // Anchor the end time on first start (or after a pause). We use the
    // current secondsLeft so pause/resume preserves the remaining duration.
    if (endAtRef.current == null) {
      endAtRef.current = Date.now() + secondsLeft * 1000;
    }

    intervalRef.current = setInterval(tick, 250);

    // On tab becoming visible again (screen wake), immediately reconcile.
    // Without this the user sees a stale value for up to ~250ms and, more
    // importantly, a timer whose end time has already passed fires onComplete
    // the moment the screen wakes instead of waiting for the next tick.
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // secondsLeft intentionally omitted — the anchor is set once on start
    // and ticks read wall-clock, so we don't want to re-anchor every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, clearTimer, tick]);

  const progress = activeDuration > 0 ? 1 - secondsLeft / activeDuration : 0;

  return { secondsLeft, isRunning, progress, play, pause, reset, adjust };
}
