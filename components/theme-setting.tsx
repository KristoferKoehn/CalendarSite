"use client";

import { THEME_LABELS, setTheme, useResolvedTheme, useTheme, type Theme } from "@/lib/theme";
import { CARD_SURFACE } from "@/lib/card";

const OPTIONS: Theme[] = ["light", "dark", "system"];

/**
 * Choosing a colour scheme.
 *
 * Three options rather than a switch, because "match system" is a real preference and it is what
 * the app did before this existed — dropping it would be a regression for anyone who wants their
 * machine to decide.
 *
 * Saved in this browser rather than on the account, for the same reason as the time format: the
 * kiosk is a shared screen, and whoever sets it up should not change what everyone else sees.
 *
 * The preview line reports the theme actually in use, which is not always the one selected: with
 * "match system" chosen, what is shown is whatever the system says, and saying so avoids the
 * impression that the setting did nothing.
 */
export function ThemeSetting() {
  const preference = useTheme();
  const resolved = useResolvedTheme();
  const active: Theme = preference ?? "system";

  return (
    <section className={`max-w-xl space-y-3 p-4 ${CARD_SURFACE}`}>
      <div>
        <p className="text-lg font-medium">Appearance</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Applies to this browser only.
        </p>
      </div>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Appearance</legend>
        {OPTIONS.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="theme"
              value={option}
              checked={active === option}
              onChange={() => setTheme(option)}
            />
            {THEME_LABELS[option]}
          </label>
        ))}
      </fieldset>

      {resolved && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="theme-preview">
          Currently showing the <span className="font-medium">{resolved}</span> theme
          {active === "system" ? ", following your system setting" : ""}.
        </p>
      )}
    </section>
  );
}
