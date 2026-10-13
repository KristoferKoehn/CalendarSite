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

/** A short, human countdown: "in 12 min", "now", "started 5 min ago". */
export function formatRelative(minutes: number): string {
  const whole = Math.round(minutes);
  if (whole === 0) return "now";
  if (whole > 0) return `in ${formatDuration(whole)}`;
  return `${formatDuration(-whole)} ago`;
}
