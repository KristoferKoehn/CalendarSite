const SEATTLE_TIME_ZONE = "America/Los_Angeles";

const wallFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SEATTLE_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SEATTLE_TIME_ZONE,
  timeZoneName: "longOffset",
});

function partNumber(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  return Number(parts.find((part) => part.type === type)?.value ?? "0");
}

function wallClockToUtcMs(parts: Intl.DateTimeFormatPart[]): number {
  return Date.UTC(
    partNumber(parts, "year"),
    partNumber(parts, "month") - 1,
    partNumber(parts, "day"),
    partNumber(parts, "hour"),
    partNumber(parts, "minute"),
    partNumber(parts, "second"),
  );
}

/**
 * Convert a Seattle wall-clock date and time to a UTC instant.
 * Best-effort around DST transitions; the backend is authoritative for DST.
 */
export function seattleWallTimeToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const wallAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = wallFormatter.formatToParts(new Date(wallAsUtcMs));
  const zonedWallMs = wallClockToUtcMs(parts);
  const offsetMs = zonedWallMs - wallAsUtcMs;

  return new Date(wallAsUtcMs - offsetMs);
}

/** Format a Seattle wall-clock time as an ISO string with its UTC offset. */
export function seattleWallTimeToLocalIso(
  date: string,
  time: string,
  utc: Date,
): string {
  const offsetPart = offsetFormatter
    .formatToParts(utc)
    .find((part) => part.type === "timeZoneName")?.value;

  const offset = offsetPart?.startsWith("GMT") ? offsetPart.slice(3) : "+00:00";
  return `${date}T${time}:00${offset}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Format two Seattle local ISO strings as "Oct 10, 14:00 - 15:00". */
export function formatSeattleRange(startLocal: string, endLocal: string): string {
  const [, month, day] = startLocal.slice(0, 10).split("-").map(Number);
  const startTime = startLocal.slice(11, 16);
  const endTime = endLocal.slice(11, 16);
  return `${MONTHS[month - 1]} ${day}, ${startTime} - ${endTime}`;
}

/** How far ahead counts as "starting soon". */
export const APPROACHING_MINUTES = 15;

/** Today's date as YYYY-MM-DD in Seattle, which is the zone the agenda is for. */
export function seattleToday(now: Date = new Date()): string {
  const parts = wallFormatter.formatToParts(now);
  const year = partNumber(parts, "year");
  const month = partNumber(parts, "month");
  const day = partNumber(parts, "day");
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * "14:00" from a Seattle local ISO string. Reads the wall clock out of the string
 * rather than reformatting, so it cannot shift with the viewer's own time zone.
 */
export function localClock(iso: string): string {
  return iso.slice(11, 16);
}

/** "Thursday, 12 October" for a YYYY-MM-DD date, without time zone conversion. */
export function formatLongDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const dateAsUtc = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateAsUtc);
}

/** "2 hours 15 min", "45 min". Used for durations and countdowns. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hourLabel} ${mins} min`;
}

export type EventPhase = "active" | "approaching" | "upcoming" | "past";

/** Anything with a start and end instant, in the offset-bearing Seattle form. */
export type TimeSlot = { startAtLocal: string; endAtLocal: string };

export type SlotStatus = {
  phase: EventPhase;
  /** Whole minutes until the start; negative once it has started. */
  minutesUntilStart: number;
  /** Whole minutes until the end; negative once it has finished. */
  minutesUntilEnd: number;
  /** Whole minutes the slot lasts. */
  durationMinutes: number;
  /** True only between the start and the end. */
  isActive: boolean;
  /** True when it starts within the next APPROACHING_MINUTES and has not started. */
  isApproaching: boolean;
};

/**
 * Classify a slot relative to `now`. Both instants are parsed from the
 * offset-bearing local strings, so the comparison is instant-to-instant and stays
 * correct across daylight saving and for a viewer in any time zone.
 *
 * A zero-length slot is never described as active or upcoming; malformed input
 * falls back to "upcoming" rather than throwing.
 */
export function describeSlot(slot: TimeSlot, now: Date = new Date()): SlotStatus {
  const start = new Date(slot.startAtLocal);
  const end = new Date(slot.endAtLocal);
  const nowMs = now.getTime();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      phase: "upcoming",
      minutesUntilStart: 0,
      minutesUntilEnd: 0,
      durationMinutes: 0,
      isActive: false,
      isApproaching: false,
    };
  }

  const minutesUntilStart = (start.getTime() - nowMs) / 60000;
  const minutesUntilEnd = (end.getTime() - nowMs) / 60000;
  const hasLength = end.getTime() > start.getTime();

  const isActive =
    hasLength && nowMs >= start.getTime() && nowMs < end.getTime();
  const isApproaching =
    hasLength && !isActive && minutesUntilStart > 0 && minutesUntilStart <= APPROACHING_MINUTES;

  let phase: EventPhase;
  if (isActive) phase = "active";
  else if (isApproaching) phase = "approaching";
  else if (nowMs < start.getTime()) phase = "upcoming";
  else phase = "past";

  return {
    phase,
    minutesUntilStart,
    minutesUntilEnd,
    durationMinutes: hasLength ? (end.getTime() - start.getTime()) / 60000 : 0,
    isActive,
    isApproaching,
  };
}

/**
 * "14:05" for an instant, in Seattle. This is the current wall-clock time, which is a
 * different question from `localClock`, and `localClock` is not a substitute: it slices
 * a string that already carries a Seattle offset, so handing it a UTC instant would
 * report the UTC hour.
 */
export function seattleClock(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SEATTLE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/** "October 12, 2026" for a YYYY-MM-DD calendar date, without time zone conversion. */
export function formatFullDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** A short, human countdown: "in 12 min", "now", "started 5 min ago". */
export function formatRelative(minutes: number): string {
  const whole = Math.round(minutes);
  if (whole === 0) return "now";
  if (whole > 0) return `in ${formatDuration(whole)}`;
  return `${formatDuration(-whole)} ago`;
}

/*
 * Calendar-date arithmetic on YYYY-MM-DD strings.
 *
 * These are deliberately pure string maths rather than Date arithmetic. A calendar
 * date is not an instant: "2026-03-08" is a label for a day in Seattle, and pushing
 * it through the local Date constructor would interpret it in the *viewer's* zone,
 * so a user in Auckland could see the grid shift by a day. UTC is used only as a
 * stable way to count days, never as a time zone claim.
 */

/** Parse YYYY-MM-DD into a UTC-midnight Date, for arithmetic only. */
function asUtc(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a UTC-midnight Date back to YYYY-MM-DD. */
function fromUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Shift a calendar date by whole days. Negative values move backwards. */
export function addDays(date: string, days: number): string {
  const d = asUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/**
 * The first day of the week containing `date`. Weeks start on Sunday, matching the
 * backend's Seattle-day boundaries and the convention of the rest of the UI.
 */
export function startOfWeek(date: string): string {
  return addDays(date, -asUtc(date).getUTCDay());
}

/** The first day of `date`'s month. */
export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/**
 * The last day of `date`'s month.
 *
 * Derived by stepping to the first of the next month and back one day, rather than
 * by table lookup, so leap years need no special case.
 */
export function endOfMonth(date: string): string {
  const first = asUtc(startOfMonth(date));
  first.setUTCMonth(first.getUTCMonth() + 1);
  return addDays(fromUtc(first), -1);
}

/** Shift a date by whole months, clamping to the end of the target month. */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = Number(endOfMonth(fromUtc(target)).slice(8, 10));
  const clamped = Math.min(day, lastDay);
  return `${fromUtc(target).slice(0, 7)}-${String(clamped).padStart(2, "0")}`;
}

/** "October 2026" for a YYYY-MM-DD in that month. */
export function formatMonthYear(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(asUtc(date));
}

/** "Sun", "Mon", … for a YYYY-MM-DD, without time zone conversion. */
export function formatWeekdayNarrow(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" }).format(
    asUtc(date),
  );
}

/** "Thursday 12" — the agenda heading for a single day. */
export function formatWeekdayAndDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(asUtc(date));
}

/**
 * The Seattle calendar date of an appointment's start, read straight off the
 * offset-bearing local string. Slicing rather than parsing keeps this independent of
 * the viewer's time zone, which is the whole reason those strings carry an offset.
 */
export function seattleDateOf(localIso: string): string {
  return localIso.slice(0, 10);
}
