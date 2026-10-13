"use client";

import { useSyncExternalStore } from "react";

/**
 * A ticking clock shared by the whole app.
 *
 * Implemented as an external store read through `useSyncExternalStore`, which is
 * what makes it correct here:
 *
 * - `getServerSnapshot` returns null, so nothing time-dependent is baked into the
 *   prerendered HTML, and the hydration render matches it.
 * - The client snapshot is the real clock, so the first browser render is accurate.
 * - Updates arrive from a timer rather than from inside an effect, which the lint
 *   config rejects, and a single shared interval serves every subscriber.
 */
let current: Date | null = null;
const listeners = new Set<() => void>();
let timer: number | null = null;

function tick() {
  current = new Date();
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (timer === null) {
    // Coarse enough to be cheap, fine enough that "starts in 12 min" never lags.
    timer = window.setInterval(tick, 30_000);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): Date | null {
  // On the very first client read the interval has not fired yet, so seed it.
  if (current === null) current = new Date();
  return current;
}

function getServerSnapshot(): Date | null {
  return null;
}

/** The current time, or null while rendering on the server / before hydration. */
export function useNow(): Date | null {
  // The store functions are module-level constants, so they are already stable
  // across renders and no memoisation is needed.
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
