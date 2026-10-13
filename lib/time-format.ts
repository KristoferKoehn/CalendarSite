"use client";

import { useSyncExternalStore } from "react";

/**
 * How clock times are written: "9:30 AM" or "09:30".
 *
 * Stored per browser rather than on the account, deliberately. The kiosk is a shared screen and
 * the person looking at it is not necessarily the person signed in; whoever sets up that
 * display should be able to choose without changing what everybody else sees on their own
 * machines. It is also a display preference with no server-side consequence, so there is
 * nothing to keep in step between devices.
 */
export type TimeFormat = "12h" | "24h";

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  "12h": "12-hour (9:30 AM)",
  "24h": "24-hour (09:30)",
};

const STORAGE_KEY = "calendarsite.timeFormat";

/**
 * Read through an external store for the same reasons as the clock in `use-now`: the server
 * snapshot is null so nothing preference-dependent is baked into the prerendered HTML, and a
 * change here re-renders every subscriber at once.
 *
 * `null` means "not read yet", which is distinct from a decided default. The very first client
 * read resolves both the absent key and an unreadable storage into 24-hour, which is what the
 * project already used everywhere.
 */
let current: TimeFormat | null = null;
const listeners = new Set<() => void>();

function read(): TimeFormat {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "12h" || stored === "24h" ? stored : "24h";
  } catch {
    // Storage can throw outright — a browser with it disabled, or a partitioned context. The
    // preference is a convenience, so falling back is better than failing the render.
    return "24h";
  }
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // Another tab changing the preference should reach this one. Registered once per subscriber
  // and removed with it, so the count stays correct.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): TimeFormat {
  if (current === null) current = read();
  return current;
}

function getServerSnapshot(): TimeFormat | null {
  return null;
}

/** The stored preference, or null while rendering on the server / before hydration. */
export function useTimeFormat(): TimeFormat | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Set and persist the preference, notifying every subscriber. */
export function setTimeFormat(next: TimeFormat): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Persisting failed, but the change should still apply for this session.
  }
  current = next;
  for (const listener of listeners) listener();
}
