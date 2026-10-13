import { addDays, endOfMonth, seattleDateOf, startOfMonth, startOfWeek } from "./time";

/** One cell of the month grid. */
export type CalendarDay = {
  /** YYYY-MM-DD, a Seattle calendar date. */
  date: string;
  /** Day of the month, for the cell label. */
  dayOfMonth: number;
  /** False for the leading and trailing days borrowed from the neighbouring months. */
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
};

/**
 * Build the month grid: whole weeks, Sunday to Saturday, covering `anchor`'s month.
 *
 * Always returns complete weeks, which is what makes the layout a plain 7-column
 * grid. A month therefore occupies 4 to 6 rows — 6 only for a 31-day month that
 * starts on the last day of a week. Callers that need a fixed height should size the
 * rows to the content rather than assuming 6.
 */
export function buildMonthGrid(anchor: string, today: string): CalendarDay[] {
  const firstOfMonth = startOfMonth(anchor);
  const lastOfMonth = endOfMonth(anchor);

  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = addDays(startOfWeek(lastOfMonth), 6);

  const days: CalendarDay[] = [];
  for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) {
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    days.push({
      date,
      dayOfMonth: Number(date.slice(8, 10)),
      inMonth: date >= firstOfMonth && date <= lastOfMonth,
      isToday: date === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }
  return days;
}

/** The inclusive range a grid covers, plus the exclusive bound the API expects. */
export function gridRange(days: CalendarDay[]): { from: string; toExclusive: string } {
  const first = days[0];
  const last = days[days.length - 1];
  return {
    from: first.date,
    // The API's `to` is exclusive, so the last visible day needs one more day of
    // range or its own bookings would be missing.
    toExclusive: addDays(last.date, 1),
  };
}

/**
 * Turn anything the calendar is anchored on into a real calendar date.
 *
 * Bare months are accepted because they are what a person writes in a URL: `?m=2026-11`
 * is a natural way to link to a month. Passing one straight through would be a crash
 * rather than a cosmetic problem, because the month-end lookup reads characters 8-10 of
 * the string and would take `Number("")` as NaN.
 *
 * Anything unparseable falls back to `today`, so a mistyped link shows the current month
 * instead of an error page.
 */
export function normaliseAnchor(value: string | null | undefined, today: string): string {
  if (!value) return today;

  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return today;

  const month = Number(match[2]);
  if (month < 1 || month > 12) return today;

  // A bare month is anchored on the first, which is a real date the grid can use.
  if (match[3] === undefined) return `${match[1]}-${match[2]}-01`;

  const day = Number(match[3]);
  if (day < 1) return today;

  // Reject a day the month does not have. The last day is derived rather than tabled, so
  // February in a leap year needs no special case.
  const lastDay = Number(endOfMonth(`${match[1]}-${match[2]}-01`).slice(8, 10));
  if (day > lastDay) return today;

  return value;
}

/**
 * The date a day view should show, from a URL value.
 *
 * Deliberately full dates only. A bare month is a month anchor, not a day, so it is not
 * accepted here — `normaliseDate("2026-11", today)` is today, not the first of November.
 * Anything unusable falls back to `today`, so a hand-edited link shows today rather than
 * an error.
 */
export function normaliseDate(value: string | null | undefined, today: string): string {
  if (!value) return today;
  // A date is only usable if it is the same value once validated as an anchor.
  return normaliseAnchor(value, today) === value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : today;
}

/** The seven days of the week containing `date`. */export function weekDays(date: string, today: string): CalendarDay[] {
  const start = startOfWeek(date);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const dayOfWeek = new Date(`${d}T00:00:00Z`).getUTCDay();
    days.push({
      date: d,
      dayOfMonth: Number(d.slice(8, 10)),
      inMonth: true,
      isToday: d === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }
  return days;
}

/** Anything with a start instant in the offset-bearing Seattle form. */
type HasStart = { startAtLocal: string };

/**
 * Bucket appointments by their Seattle calendar date.
 *
 * Grouping is by start date: an appointment appears on the day it begins. A booking
 * that runs past midnight shows only on its first day, which keeps each day's list
 * describing what *starts* that day rather than double-counting one booking across
 * two.
 */
export function groupByDate<T extends HasStart>(items: T[]): Map<string, T[]> {
  const byDate = new Map<string, T[]>();
  for (const item of items) {
    const date = seattleDateOf(item.startAtLocal);
    const bucket = byDate.get(date);
    if (bucket) bucket.push(item);
    else byDate.set(date, [item]);
  }
  for (const bucket of byDate.values()) {
    bucket.sort((a, b) => a.startAtLocal.localeCompare(b.startAtLocal));
  }
  return byDate;
}

/** How many events a month cell shows before it collapses into "+N more". */
export const CELL_EVENT_LIMIT = 2;

export type CellContents<T> = {
  shown: T[];
  hiddenCount: number;
};

/**
 * The events a cell should render, capped at `limit`.
 *
 * Truncation happens here rather than in the component so the count and the visible
 * slice cannot disagree, which is the usual bug when a "+N more" label is computed
 * separately from the list beneath it.
 */
export function cellContents<T>(
  items: T[] | undefined,
  limit: number = CELL_EVENT_LIMIT,
): CellContents<T> {
  if (!items || items.length === 0) return { shown: [], hiddenCount: 0 };
  if (items.length <= limit) return { shown: items, hiddenCount: 0 };
  return { shown: items.slice(0, limit), hiddenCount: items.length - limit };
}
