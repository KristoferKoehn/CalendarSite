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
