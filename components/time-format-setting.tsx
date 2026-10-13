"use client";

import { TIME_FORMAT_LABELS, setTimeFormat, useTimeFormat, type TimeFormat } from "@/lib/time-format";
import { CARD_SURFACE } from "@/lib/card";
import { formatClockParts } from "@/lib/time";

/**
 * Choosing how clock times are written.
 *
 * Saved in this browser rather than on the account: the kiosk is a shared screen and the person
 * reading it is not necessarily the person signed in, so whoever sets up that display should be
 * able to pick without changing what everyone else sees on their own machines.
 *
 * The example is the time of the next whole hour, formatted with the same helper the agenda
 * uses, so the preview cannot disagree with what the choice actually does.
 */
export function TimeFormatSetting() {
  const format = useTimeFormat();
  // Null while rendering on the server; 24-hour is what the markup already shows.
  const active: TimeFormat = format ?? "24h";

  const sample = `${String(new Date().getHours()).padStart(2, "0")}:30`;
  const options: TimeFormat[] = ["12h", "24h"];

  return (
    <section className={`max-w-xl space-y-3 p-4 ${CARD_SURFACE}`}>
      <div>
        <p className="text-lg font-medium">Time format</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Applies to the clock and every booking time, on this browser only.
        </p>
      </div>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Time format</legend>
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="time-format"
              value={option}
              checked={active === option}
              onChange={() => setTimeFormat(option)}
            />
            {TIME_FORMAT_LABELS[option]}
          </label>
        ))}
      </fieldset>

      <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="time-format-preview">
        Bookings will read <span className="font-medium">{formatClockParts(sample, active)}</span>.
      </p>
    </section>
  );
}
