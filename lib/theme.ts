"use client";

import { useSyncExternalStore } from "react";

/**
 * Which colour scheme to use.
 *
 * Three states rather than two, because "follow my system" is a real preference and dropping it
 * would be a regression: before this, the app followed the OS and nothing else. Someone who wants
 * their machine to decide at sunset should still be able to say so.
 */
export type Theme = "light" | "dark" | "system";

export const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
};

export const THEME_STORAGE_KEY = "calendarsite.theme";

/** The class the `dark:` variant keys off. See `@custom-variant` in globals.css. */
export const DARK_CLASS = "dark";

/**
 * The script that applies the theme before the first paint.
 *
 * Exported as a string, and inlined into the document head as a blocking script, because the
 * alternative is a flash: React cannot run early enough, so a theme chosen in JavaScript would
 * only apply after hydration and the wrong colours would be painted first. This runs before
 * anything is rendered.
 *
 * Kept as a string rather than written inline in the layout so the storage key and the class name
 * live in one place. The layout cannot import a function and also run it synchronously in the
 * browser, so the source of truth is repeated here as literals — the test asserts they match.
 */
export function themeBootstrapScript(): string {
  return `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};var c=${JSON.stringify(DARK_CLASS)};
var s=localStorage.getItem(k);
var d=s==="dark"||((s===null||s==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle(c,d);
document.documentElement.style.colorScheme=d?"dark":"light";
}catch(e){}})();`;
}

/** Resolve a preference to the theme actually shown. */
export function resolveTheme(preference: Theme, systemPrefersDark: boolean): "light" | "dark" {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

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
