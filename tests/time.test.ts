import { describe, expect, it } from "vitest";
import {
  describeSlot,
  formatDuration,
  formatLongDate,
  formatRelative,
  formatSeattleRange,
  localClock,
  seattleToday,
  seattleWallTimeToLocalIso,
  seattleWallTimeToUtc,
} from "@/lib/time";

describe("seattleWallTimeToUtc", () => {
  it("converts Pacific Daylight Time", () => {
    const utc = seattleWallTimeToUtc("2026-10-10", "14:00");
    expect(utc.toISOString()).toBe("2026-10-10T21:00:00.000Z");
  });

  it("converts Pacific Standard Time", () => {
    const utc = seattleWallTimeToUtc("2026-01-15", "14:00");
    expect(utc.toISOString()).toBe("2026-01-15T22:00:00.000Z");
  });
});

describe("seattleWallTimeToLocalIso", () => {
  it("returns a Seattle wall-clock ISO string", () => {
    const utc = seattleWallTimeToUtc("2026-10-10", "14:00");
    const iso = seattleWallTimeToLocalIso("2026-10-10", "14:00", utc);
    expect(iso.startsWith("2026-10-10T14:00:00")).toBe(true);
  });
});

describe("formatSeattleRange", () => {
  it("formats a Seattle range", () => {
    expect(
      formatSeattleRange(
        "2026-10-10T14:00:00-07:00",
        "2026-10-10T15:00:00-07:00",
      ),
    ).toBe("Oct 10, 14:00 - 15:00");
  });
});

describe("seattleToday", () => {
  // 07:00Z is midnight in Seattle during PDT, so the day flips here.
  it("takes the Seattle date, not UTC", () => {
    expect(seattleToday(new Date("2026-06-15T07:00:00Z"))).toBe("2026-06-15");
  });
  it("is still the previous day just before Seattle midnight", () => {
    expect(seattleToday(new Date("2026-06-15T06:59:00Z"))).toBe("2026-06-14");
  });
  it("handles the standard-time offset", () => {
    expect(seattleToday(new Date("2026-01-15T07:59:00Z"))).toBe("2026-01-14");
    expect(seattleToday(new Date("2026-01-15T08:00:00Z"))).toBe("2026-01-15");
  });
});

describe("localClock", () => {
  it("reads the wall clock straight out of the string", () => {
    expect(localClock("2026-10-10T14:05:00-07:00")).toBe("14:05");
    expect(localClock("2026-01-15T09:30:00-08:00")).toBe("09:30");
  });
});

describe("formatLongDate", () => {
  it("renders a weekday and date without shifting by time zone", () => {
    expect(formatLongDate("2026-10-15")).toBe("Thursday, October 15");
  });
  it("does not go back a day for a UTC-negative viewer", () => {
    // Parsed as UTC midday-free midnight; must stay the 1st.
    expect(formatLongDate("2026-11-01")).toBe("Sunday, November 1");
  });
});

describe("formatDuration", () => {
  it("renders minutes only", () => {
    expect(formatDuration(45)).toBe("45 min");
  });
  it("renders whole hours", () => {
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(120)).toBe("2 hours");
  });
  it("renders hours and minutes", () => {
    expect(formatDuration(135)).toBe("2 hours 15 min");
  });
  it("never goes negative", () => {
    expect(formatDuration(-10)).toBe("0 min");
  });
});

describe("formatRelative", () => {
  it("describes the future, now, and the past", () => {
    expect(formatRelative(12)).toBe("in 12 min");
    expect(formatRelative(0)).toBe("now");
    expect(formatRelative(-5)).toBe("5 min ago");
  });
});

describe("describeSlot", () => {
  const slot = {
    startAtLocal: "2026-10-15T14:00:00-07:00",
    endAtLocal: "2026-10-15T15:00:00-07:00",
  };
  // 14:00-07:00 == 21:00Z, and 15:00-07:00 == 22:00Z.
  const at = (iso: string) => describeSlot(slot, new Date(iso));

  it("is upcoming well before the start", () => {
    const s = at("2026-10-15T20:00:00Z");
    expect(s.phase).toBe("upcoming");
    expect(s.isActive).toBe(false);
    expect(s.isApproaching).toBe(false);
    expect(Math.round(s.minutesUntilStart)).toBe(60);
  });

  it("is approaching exactly 15 minutes out", () => {
    const s = at("2026-10-15T20:45:00Z");
    expect(s.phase).toBe("approaching");
    expect(s.isApproaching).toBe(true);
    expect(s.isActive).toBe(false);
  });

  it("is not approaching at 16 minutes out", () => {
    expect(at("2026-10-15T20:44:00Z").phase).toBe("upcoming");
  });

  it("is active from the start instant", () => {
    const s = at("2026-10-15T21:00:00Z");
    expect(s.phase).toBe("active");
    expect(s.isActive).toBe(true);
    expect(s.isApproaching).toBe(false);
  });

  it("is active mid-slot and reports time remaining", () => {
    const s = at("2026-10-15T21:30:00Z");
    expect(s.phase).toBe("active");
    expect(Math.round(s.minutesUntilEnd)).toBe(30);
    expect(s.durationMinutes).toBe(60);
  });

  it("is no longer active at the end instant, since the range is half-open", () => {
    const s = at("2026-10-15T22:00:00Z");
    expect(s.isActive).toBe(false);
    expect(s.phase).toBe("past");
  });

  it("stays past afterwards", () => {
    expect(at("2026-10-15T23:30:00Z").phase).toBe("past");
  });

  it("is not approaching until the same instant it starts", () => {
    // One minute before the start is still approaching, not active.
    const s = at("2026-10-15T20:59:00Z");
    expect(s.phase).toBe("approaching");
    expect(s.isActive).toBe(false);
  });

  it("treats a zero-length slot as not active and not approaching", () => {
    const s = describeSlot(
      { startAtLocal: "2026-10-15T14:00:00-07:00", endAtLocal: "2026-10-15T14:00:00-07:00" },
      new Date("2026-10-15T21:00:00Z"),
    );
    expect(s.isActive).toBe(false);
    expect(s.isApproaching).toBe(false);
  });

  it("falls back to upcoming on malformed input rather than throwing", () => {
    const s = describeSlot({ startAtLocal: "nonsense", endAtLocal: "nonsense" });
    expect(s.phase).toBe("upcoming");
    expect(s.isActive).toBe(false);
  });

  it("stays correct across a daylight-saving change", () => {
    // 2026-11-01 is the fall-back date in Seattle; clocks go back at 02:00 local.
    // A 09:00-10:00 local booking is therefore in standard time, so it is
    // 17:00-18:00Z, not 16:00-17:00Z.
    const dst = describeSlot(
      { startAtLocal: "2026-11-01T09:00:00-08:00", endAtLocal: "2026-11-01T10:00:00-08:00" },
      new Date("2026-11-01T17:30:00Z"),
    );
    expect(dst.phase).toBe("active");
    expect(Math.round(dst.minutesUntilEnd)).toBe(30);
  });
});
