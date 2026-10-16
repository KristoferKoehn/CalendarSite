/**
 * The theme's storage key, its class name, and the script that applies it before the first paint.
 *
 * Deliberately **without** `"use client"`, unlike `lib/theme.ts`.
 *
 * The root layout is a server component and has to call `themeBootstrapScript()` while rendering
 * the document head. Putting that function in a client module made it uncallable from the server —
 * the build failed on every prerendered page with "attempted to call a client function from the
 * server". The tokens and the script are pure data with no hooks or browser state, so they belong
 * on the server side of that boundary; the client module imports them and re-exports, rather than
 * declaring its own.
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
 * Returned as a string and inlined into the document head as a blocking script, because the
 * alternative is a flash: React cannot run early enough, so a theme chosen in JavaScript would
 * only apply after hydration and the wrong colours would be painted first. This runs before
 * anything is rendered.
 *
 * It cannot import the constants above — it runs in the browser as plain text — so it repeats the
 * storage key and the class name as literals. `tests/theme.test.ts` asserts they match, because a
 * drift there would apply the theme under one key and read it under another, and the toggle would
 * appear to do nothing on reload.
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
