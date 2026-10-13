import { describe, expect, it } from "vitest";
import { formatClock, formatClockParts, formatSeattleRange, seattleClockParts } from "@/lib/time";

describe("formatClock", () => {
  const noon = "2026-10-13T12:00:00-07:00";
  const midnight = "2026-10-13T00:00:00-07:00";
  const morning = "2026-10-13T09:30:00-07:00";
  const afternoon = "2026-10-13T14:05:00-07:00";

  it("leaves 24-hour time exactly as the string holds it", () => {
    expect(formatClock(noon, "24h")).toBe("12:00");
    expect(formatClock(morning, "24h")).toBe("09:30");
    expect(formatClock(afternoon, "24h")).toBe("14:05");
    expect(formatClock(midnight, "24h")).toBe("00:00");
  });

  it("writes 12-hour time without a leading zero", () => {
    // "9:30 AM", not "09:30 AM" — nobody writes the zero.
    expect(formatClock(morning, "12h")).toBe("9:30 AM");
    expect(formatClock(afternoon, "12h")).toBe("2:05 PM");
  });

  it("names midnight and noon rather than showing 0", () => {
    // The two hours that cannot be reduced to a remainder of twelve. Getting these wrong is
    // how a clock ends up reading "0:00 AM".
    expect(formatClock(midnight, "12h")).toBe("12:00 AM");
    expect(formatClock(noon, "12h")).toBe("12:00 PM");
  });

  it("switches to PM at noon, not at one", () => {
    expect(formatClock("2026-10-13T11:59:00-07:00", "12h")).toBe("11:59 AM");
    expect(formatClock("2026-10-13T12:01:00-07:00", "12h")).toBe("12:01 PM");
  });

  it("defaults to 24-hour, which is what the app used everywhere before", () => {
    expect(formatClock(afternoon)).toBe("14:05");
  });

  it("reads the wall clock out of the string, so the viewer zone cannot shift it", () => {
    // Same instant written with a different offset. A Seattle booking at 14:05 must read
    // 14:05 whichever way the string is spelled, because the digits are the booking's own
    // wall clock.
    expect(formatClock("2026-10-13T14:05:00-07:00", "24h")).toBe("14:05");
    expect(formatClock("2026-10-13T14:05:00-08:00", "24h")).toBe("14:05");
  });
});

describe("formatClockParts", () => {
  it("formats a bare HH:mm", () => {
    expect(formatClockParts("14:05", "24h")).toBe("14:05");
    expect(formatClockParts("14:05", "12h")).toBe("2:05 PM");
    expect(formatClockParts("00:00", "12h")).toBe("12:00 AM");
  });
});

describe("formatSeattleRange", () => {
  const start = "2026-10-13T14:05:00-07:00";
  const end = "2026-10-13T15:35:00-07:00";

  it("writes the range in 24-hour time by default", () => {
    expect(formatSeattleRange(start, end)).toBe("Oct 13, 14:05 - 15:35");
  });

  it("writes the range in 12-hour time when asked", () => {
    expect(formatSeattleRange(start, end, "12h")).toBe("Oct 13, 2:05 PM - 3:35 PM");
  });

  it("carries the meridiem on both ends", () => {
    // Dropping the suffix from the second time would make "2:05 PM - 3:35" read as a range
    // that crosses noon.
    const morningRange = formatSeattleRange(
      "2026-10-13T09:00:00-07:00",
      "2026-10-13T10:30:00-07:00",
      "12h",
    );
    expect(morningRange).toBe("Oct 13, 9:00 AM - 10:30 AM");
  });
});

describe("seattleClockParts", () => {
  // 14:05 in Seattle on this date is 21:05 UTC.
  const afternoon = new Date("2026-10-13T21:05:00Z");
  // Midnight in Seattle is 07:00 UTC.
  const midnight = new Date("2026-10-13T07:00:00Z");
  const noon = new Date("2026-10-13T19:00:00Z");

  it("splits the time into parts for 24-hour display", () => {
    expect(seattleClockParts(afternoon, "24h")).toEqual({
      hours: "14", minutes: "05", suffix: null, hour12: false,
    });
  });

  it("pads the hour to two digits, which the monospace clock relies on", () => {
    // Without the pad the block would shift sideways every time the hour dropped below ten.
    expect(seattleClockParts(new Date("2026-10-13T16:05:00Z"), "24h").hours).toBe("09");
  });

  it("splits the time into parts for 12-hour display", () => {
    expect(seattleClockParts(afternoon, "12h")).toEqual({
      hours: "2", minutes: "05", suffix: "PM", hour12: true,
    });
  });

  it("names midnight and noon in 12-hour display", () => {
    // Derived from the 24-hour reading rather than a second formatter, because `hour12: false`
    // is documented to render midnight as 24 in some locales.
    expect(seattleClockParts(midnight, "12h")).toEqual({
      hours: "12", minutes: "00", suffix: "AM", hour12: true,
    });
    expect(seattleClockParts(noon, "12h")).toEqual({
      hours: "12", minutes: "00", suffix: "PM", hour12: true,
    });
  });

  it("reads midnight as 00 in 24-hour display, never 24", () => {
    expect(seattleClockParts(midnight, "24h").hours).toBe("00");
  });

  it("reports hour12 so the caller knows which separator it is getting", () => {
    // The colon blinks in one format and is a space in the other; a blinking space is nothing.
    expect(seattleClockParts(afternoon, "24h").hour12).toBe(false);
    expect(seattleClockParts(afternoon, "12h").hour12).toBe(true);
  });

  it("defaults to 24-hour", () => {
    expect(seattleClockParts(afternoon).hours).toBe("14");
  });
});
