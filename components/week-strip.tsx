"use client";

import { formatWeekdayNarrow } from "@/lib/time";
import type { CalendarDay } from "@/lib/calendar";

/** A grid day plus whether it has anything on it, which the dot needs. */
export type StripDay = CalendarDay & { hasEntries: boolean };

type WeekStripProps = {
  days: StripDay[];
  selected: string;
  onSelect: (date: string) => void;
  /** Move the strip a week at a time. */
  onPrevWeek: () => void;
  onNextWeek: () => void;
  /** True while the selected day is the viewer's today, for the "Today" affordance. */
  onToday: () => void;
  isOnToday: boolean;
};

/**
 * A week at a glance, sitting above the agenda so Today can move between days without
 * a round trip through the month view.
 *
 * Each tile carries a dot when that day has bookings, which is what makes the strip
 * useful rather than decorative: it shows where the week is busy before you click.
 */
export function WeekStrip({
  days,
  selected,
  onSelect,
  onPrevWeek,
  onNextWeek,
  onToday,
  isOnToday,
}: WeekStripProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <StripButton label="Previous week" onClick={onPrevWeek}>
            ‹
          </StripButton>
          <StripButton label="Next week" onClick={onNextWeek}>
            ›
          </StripButton>
        </div>
        <button
          type="button"
          onClick={onToday}
          disabled={isOnToday}
          className="rounded px-2 py-1 text-xs text-zinc-500 underline-offset-2 hover:underline disabled:opacity-40 disabled:hover:no-underline dark:text-zinc-400"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.date === selected;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors ${
                isSelected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="text-[11px] uppercase tracking-wide opacity-70">
                {formatWeekdayNarrow(day.date)}
              </span>
              <span className="text-sm font-medium tabular-nums">{day.dayOfMonth}</span>
              {/* A dot marks "has bookings". Kept visible on the selected tile too,
                  so selecting a day does not hide the thing you selected it for. */}
              <span
                className={`h-1 w-1 rounded-full ${
                  day.hasEntries
                    ? isSelected
                      ? "bg-white dark:bg-zinc-900"
                      : "bg-zinc-400 dark:bg-zinc-500"
                    : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StripButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded border border-zinc-200 px-2 py-1 text-sm leading-none text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}
