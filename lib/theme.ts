"use client";

import { useSyncExternalStore } from "react";
import {
  DARK_CLASS,
  THEME_STORAGE_KEY,
  resolveTheme,
  type Theme,
} from "@/lib/theme-bootstrap";

/**
 * The theme preference for this browser.
 *
 * The tokens, the labels and the bootstrap script live in `lib/theme-bootstrap.ts`, which has no
 * `"use client"` — the root layout is a server component and must be able to call the script while
 * rendering the head. They are re-exported here so consumers have one import for everything.
 */
export { DARK_CLASS, THEME_LABELS, THEME_STORAGE_KEY, resolveTheme, themeBootstrapScript } from "@/lib/theme-bootstrap";
export type { Theme } from "@/lib/theme-bootstrap";

export function prefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    // No matchMedia: a very old browser or a test environment. Light is the safe default and
    // matches the stylesheet's own base.
    return false;
  }
}

let current: Theme | null = null;
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    // Storage can throw outright — disabled, or a partitioned context. The preference is a
    // convenience, so following the system is a better fallback than failing to render.
    return "system";
  }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  // With "system" selected, the OS changing must repaint. Without this the class would be stale
  // until the next reload, which is exactly the case the "system" option exists for.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (getSnapshot() === "system") applyTheme("system");
  };
  media.addEventListener("change", onMedia);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    media.removeEventListener("change", onMedia);
  };
}

function getSnapshot(): Theme {
  if (current === null) current = read();
  return current;
}

/** Null on the server and before hydration, so no preference is baked into the prerendered HTML. */
function getServerSnapshot(): Theme | null {
  return null;
}

/** The stored preference, or null while rendering on the server / before hydration. */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The theme actually being shown. Null until hydrated. */
export function useResolvedTheme(): "light" | "dark" | null {
  const preference = useTheme();
  if (preference === null) return null;
  return resolveTheme(preference, prefersDark());
}

/**
 * Apply a preference to the document, without persisting it.
 *
 * Used both by the setter and by the system-preference listener, which must repaint without
 * writing a preference the user never chose.
 */
export function applyTheme(preference: Theme): void {
  const dark = resolveTheme(preference, prefersDark()) === "dark";
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  // Tells the browser how to paint its own chrome — scrollbars and form controls — so they match
  // rather than staying light against a dark page.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** Set and persist the preference, applying it and notifying every subscriber. */
export function setTheme(next: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Persisting failed, but the change should still apply for this session.
  }
  current = next;
  applyTheme(next);
  notify();
}

/** Flip between light and dark, resolving whichever is currently shown first. */
export function toggleTheme(): void {
  const nowDark = resolveTheme(getSnapshot(), prefersDark()) === "dark";
  setTheme(nowDark ? "light" : "dark");
}
