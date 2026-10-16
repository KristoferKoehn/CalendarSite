"use client";

import { toggleTheme, useResolvedTheme } from "@/lib/theme";

/**
 * A sun and a moon.
 *
 * Inline SVG rather than `<img src="/sun.svg">`, because these need `currentColor` so they inherit
 * the button's text colour and therefore switch with the theme. An `<img>` renders the file in its
 * own context and would need two files per theme, or a filter, to achieve the same thing.
 *
 * The sun is drawn as a ring with eight rays clear of it; the moon as a single closed path. Both
 * are stroke-only so they stay legible at 16px, which is where they actually appear.
 */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.5v2.1" />
      <path d="M12 19.4v2.1" />
      <path d="M2.5 12h2.1" />
      <path d="M19.4 12h2.1" />
      <path d="M5.28 5.28l1.49 1.49" />
      <path d="M17.23 17.23l1.49 1.49" />
      <path d="M18.72 5.28l-1.49 1.49" />
      <path d="M6.77 17.23l-1.49 1.49" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5a8.5 8.5 0 1 0 10.9 10.9z" />
    </svg>
  );
}

/**
 * Switches between light and dark.
 *
 * Renders an empty, invisible placeholder until hydration, because the server does not know which
 * theme is in use. Showing one of the two icons and correcting it after hydration would be worse
 * than showing neither: it would point the wrong way for a moment, and the whole point of the
 * bootstrap script is that the theme is never wrong, not even briefly.
 *
 * The icon shows what pressing it *does* rather than what is currently on — the moon means "switch
 * to dark". The accessible name says so in words, since an icon alone cannot.
 */
export function ThemeToggle() {
  const theme = useResolvedTheme();

  if (theme === null) {
    return <span className="inline-block h-6 w-6" aria-hidden="true" />;
  }

  const goingTo = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // Named by what it will do, which is what a button's label should describe.
      aria-label={`Switch to ${goingTo} theme`}
      title={`Switch to ${goingTo} theme`}
      className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {goingTo === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
