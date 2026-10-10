import { describe, expect, it } from "vitest";
import {
  formatSeattleRange,
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
