"use client";

import { formatClock, formatWeekdayNarrow } from "@/lib/time";
import { useTimeFormat } from "@/lib/time-format";
import { CELL_EVENT_LIMIT, type CalendarDay } from "@/lib/calendar";

/** Anything the grid needs to render: a time and a label. */
export type CalendarEntry = {
  id: string;
  startAtLocal: string;
  title: string;
  cancelled: boolean;
};

type MonthGridProps = {
  days: CalendarDay[];
  /** Entries per Seattle calendar date, already sorted. */
  byDate: Map<string, CalendarEntry[]>;
  selected: string | null;
  /**
   * Optional. Without it the day numbers are plain text rather than buttons, so a cell
   * does not present itself as clickable when clicking it would do nothing.
   */
  onSelect?: (date: string) => void;
};

/**
 * A month as a plain seven-column grid.
 *
 * The weekday headers are derived from the first row of `days` rather than written
 * out here. The caller already pads the grid to whole weeks, so taking the labels
 * from that same data is what guarantees the header row cannot drift out of step
 * with the columns beneath it.
 */
export function MonthGrid({ days, byDate, selected, onSelect }: MonthGridProps) {
  const headers = days.slice(0, 7).map((day) => ({
    date: day.date,
    label: formatWeekdayNarrow(day.date),
  }));

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        {headers.map((header) => (
          <div
            key={header.date}
            className="px-2 py-1.5 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            {header.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            entries={byDate.get(day.date) ?? []}
            isSelected={selected === day.date}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

/** Shared so the button and plain-text forms of the day number look identical. */
function dayNumberClass(day: CalendarDay): string {
  return `inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors ${
    day.isToday
      ? "bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
      : day.inMonth
        ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        : "text-zinc-400 hover:bg-zinc-100 dark:text-zinc-600 dark:hover:bg-zinc-800"
  }`;
}

function DayCell({
  day,
  entries,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  entries: CalendarEntry[];
  isSelected: boolean;
  onSelect?: (date: string) => void;
}) {
  const live = entries.filter((entry) => !entry.cancelled);
  const shown = live.slice(0, CELL_EVENT_LIMIT);
  const hiddenCount = live.length - shown.length;
  // Read here rather than passed down: a month cell is a leaf, and threading a display
  // preference through the grid to reach it would be noise.
  const timeFormat = useTimeFormat() ?? "24h";

  // A quiet tint separates the borrowed days from the month itself, and a slightly
  // stronger one marks the weekend, without either becoming a colour block.
  const base = day.inMonth
    ? day.isWeekend
      ? "bg-zinc-50/70 dark:bg-zinc-900/40"
      : "bg-white dark:bg-zinc-950"
    : "bg-zinc-50/40 dark:bg-zinc-900/20";

  return (
    <div
      className={`relative min-h-[6.5rem] border-b border-r border-zinc-100 p-1.5 dark:border-zinc-800/70 ${base} ${
        isSelected ? "ring-2 ring-inset ring-zinc-900 dark:ring-zinc-100" : ""
      }`}
    >
      {/* The day number is the button rather than the whole cell, so the click target is
          the label a reader is already aiming at, and the cell keeps room for events
          without a full-cell hit area swallowing them. With no handler it is plain text. */}
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(day.date)}
          aria-label={`Show bookings for ${day.date}`}
          aria-pressed={isSelected}
          className={dayNumberClass(day)}
        >
          {day.dayOfMonth}
        </button>
      ) : (
        <span className={dayNumberClass(day)}>{day.dayOfMonth}</span>
      )}

      <ul className="mt-1 space-y-0.5">
        {shown.map((entry) => (
          <li
            key={entry.id}
            className="flex items-baseline gap-1 truncate rounded bg-zinc-100/80 px-1 py-0.5 text-[11px] leading-tight dark:bg-zinc-800/70"
            title={`${formatClock(entry.startAtLocal, timeFormat)} ${entry.title}`}
          >
            {/* On a phone a month cell is about 46px wide, so a time and a title cannot
                both fit. The time is dropped there rather than letting it consume the
                whole chip, which left the title invisible. The title identifies the
                booking; the exact time is one tap away in the day view. */}
            <span className="hidden tabular-nums text-zinc-500 sm:inline dark:text-zinc-400">
              {formatClock(entry.startAtLocal, timeFormat)}
            </span>
            <span className="truncate text-zinc-700 dark:text-zinc-200">{entry.title}</span>
          </li>
        ))}
      </ul>

      {/* "+N more" is only actionable when the cell is: with no handler there is nothing
          to expand into, so the count is plain text. */}
      {hiddenCount > 0 &&
        (onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(day.date)}
            className="mt-0.5 px-1 text-[11px] text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            +{hiddenCount} more
          </button>
        ) : (
          <span className="mt-0.5 block px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            +{hiddenCount} more
          </span>
        ))}
    </div>
  );
}
