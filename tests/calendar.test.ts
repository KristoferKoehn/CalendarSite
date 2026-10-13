import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  canBookEmptyDay,
  cellContents,
  gridRange,
  groupByDate,
  normaliseAnchor,
  normaliseDate,
  weekDays,
} from "@/lib/calendar";
import {
  addDays,
  addMonths,
  endOfMonth,
  formatMonthYear,
  formatWeekdayNarrow,
  seattleDateOf,
  startOfMonth,
  startOfWeek,
} from "@/lib/time";

describe("calendar date arithmetic", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonth("2027-02-10")).toBe("2027-02-28");
  });

  it("finds month bounds", () => {
    expect(startOfMonth("2026-10-17")).toBe("2026-10-01");
    expect(endOfMonth("2026-10-17")).toBe("2026-10-31");
    expect(endOfMonth("2026-04-05")).toBe("2026-04-30");
  });

  it("finds the Sunday that starts the week", () => {
    // 2026-10-12 is a Monday.
    expect(startOfWeek("2026-10-12")).toBe("2026-10-11");
    // A Sunday is its own week start.
    expect(startOfWeek("2026-10-11")).toBe("2026-10-11");
    // A Saturday belongs to the week that began six days earlier.
    expect(startOfWeek("2026-10-17")).toBe("2026-10-11");
  });

  it("shifts months, clamping the day to the target month", () => {
    expect(addMonths("2026-10-17", 1)).toBe("2026-11-17");
    expect(addMonths("2026-10-17", -1)).toBe("2026-09-17");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    // 31 January has no 31 February, so it clamps.
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    // And a leap year clamps to 29 instead.
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("formats labels without shifting to the viewer's zone", () => {
    expect(formatMonthYear("2026-10-12")).toBe("October 2026");
    expect(formatWeekdayNarrow("2026-10-11")).toBe("S");
    expect(formatWeekdayNarrow("2026-10-12")).toBe("M");
  });

  it("reads the calendar date straight off an offset-bearing string", () => {
    // Late-evening Seattle on the 12th is the 13th in UTC; the label must be the 12th.
    expect(seattleDateOf("2026-10-12T23:30:00-07:00")).toBe("2026-10-12");
    expect(seattleDateOf("2026-10-12T00:00:00-07:00")).toBe("2026-10-12");
  });
});

describe("normaliseAnchor", () => {
  it("expands a bare month, which is what a shared link looks like", () => {
    // The grid needs a real date: its month-end lookup reads characters 8-10 of the
    // string, so a bare month there produces NaN and takes the render down with it.
    expect(normaliseAnchor("2026-11", "2026-10-12")).toBe("2026-11-01");
    expect(normaliseAnchor("2026-11-01", "2026-10-12")).toBe("2026-11-01");
  });

  it("returns something the month formatter can actually print", () => {
    // The regression: formatMonthYear builds a Date from its argument, and
    // formatMonthYear("2026-11") throws "Invalid time value" because the missing day
    // reads as NaN. A bare month reaching a formatter took the whole route down, so
    // normalising has to happen before the value is displayed, not just before it is
    // used as a range.
    expect(() => formatMonthYear("2026-11")).toThrow();
    expect(() => formatMonthYear(normaliseAnchor("2026-11", "2026-10-12"))).not.toThrow();
    expect(formatMonthYear(normaliseAnchor("2026-11", "2026-10-12"))).toBe("November 2026");
  });

  it("keeps a full, valid date", () => {
    expect(normaliseAnchor("2026-11-15", "2026-10-12")).toBe("2026-11-15");
  });

  it("falls back to today for anything unusable", () => {
    const today = "2026-10-12";
    expect(normaliseAnchor(null, today)).toBe(today);
    expect(normaliseAnchor("", today)).toBe(today);
    expect(normaliseAnchor("nonsense", today)).toBe(today);
    expect(normaliseAnchor("2026-13", today)).toBe(today);
    expect(normaliseAnchor("2026-00", today)).toBe(today);
    expect(normaliseAnchor("2026-11-31", today)).toBe(today); // November has 30 days
    expect(normaliseAnchor("2026-11-00", today)).toBe(today);
  });

  it("accepts a leap day only in a leap year", () => {
    expect(normaliseAnchor("2028-02-29", "2028-01-01")).toBe("2028-02-29");
    expect(normaliseAnchor("2027-02-29", "2027-01-01")).toBe("2027-01-01");
  });
});

describe("normaliseDate", () => {
  const today = "2026-10-12";

  it("keeps a real date", () => {
    expect(normaliseDate("2026-10-20", today)).toBe("2026-10-20");
    expect(normaliseDate("2026-01-01", today)).toBe("2026-01-01");
    expect(normaliseDate("2028-02-29", today)).toBe("2028-02-29");
  });

  it("refuses a bare month, which is a month anchor rather than a day", () => {
    // Distinguishing the two matters: accepting it would silently turn ?d=2026-11 into
    // the first of November.
    expect(normaliseDate("2026-11", today)).toBe(today);
  });

  it("falls back to today for anything unusable", () => {
    expect(normaliseDate(null, today)).toBe(today);
    expect(normaliseDate("", today)).toBe(today);
    expect(normaliseDate("nonsense", today)).toBe(today);
    expect(normaliseDate("2026-13-01", today)).toBe(today);
    expect(normaliseDate("2026-11-31", today)).toBe(today);
    expect(normaliseDate("2027-02-29", today)).toBe(today);
  });
});

describe("canBookEmptyDay", () => {
  it("hides the invitation on a day that has already gone", () => {
    // Booking the past is a dead end, so the empty state is the whole message.
    expect(canBookEmptyDay({ isPast: true })).toBe(false);
  });

  it("keeps it for today, which is when an empty afternoon is worth filling", () => {
    expect(canBookEmptyDay({ isPast: false })).toBe(true);
  });

  it("never shows it where the action is disabled", () => {
    // The kiosk is a display, not a console.
    expect(canBookEmptyDay({ isPast: false, actionEnabled: false })).toBe(false);
    expect(canBookEmptyDay({ isPast: true, actionEnabled: false })).toBe(false);
  });
});

describe("buildMonthGrid", () => {
  it("covers whole weeks and marks the month", () => {
    // October 2026: the 1st is a Thursday, the 31st a Saturday.
    const grid = buildMonthGrid("2026-10-15", "2026-10-15");

    expect(grid[0].date).toBe("2026-09-27"); // the Sunday on or before the 1st
    expect(grid[grid.length - 1].date).toBe("2026-10-31"); // the Saturday on or after the 31st
    expect(grid.length % 7).toBe(0);

    const inMonth = grid.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].date).toBe("2026-10-01");
    expect(inMonth[inMonth.length - 1].date).toBe("2026-10-31");

    // Leading days belong to September and are flagged out of month.
    expect(grid[0].inMonth).toBe(false);
    expect(grid[0].dayOfMonth).toBe(27);
  });

  it("marks today, and only once", () => {
    const grid = buildMonthGrid("2026-10-15", "2026-10-15");
    const todays = grid.filter((d) => d.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0].date).toBe("2026-10-15");
  });

  it("flags weekends", () => {
    const grid = buildMonthGrid("2026-10-15", "2026-10-15");
    const weekend = grid.filter((d) => d.isWeekend).map((d) => d.date);
    expect(weekend).toContain("2026-10-03"); // a Saturday
    expect(weekend).toContain("2026-10-04"); // a Sunday
    expect(weekend).not.toContain("2026-10-05"); // a Monday
  });

  it("produces a sixth row only when the month needs one", () => {
    // February 2027 starts on a Monday and has 28 days: five rows.
    const february = buildMonthGrid("2027-02-10", "2027-02-10");
    expect(february.length / 7).toBe(5);

    // May 2027 starts on a Saturday and has 31 days: six rows.
    const may = buildMonthGrid("2027-05-10", "2027-05-10");
    expect(may.length / 7).toBe(6);
  });

  it("handles February in a leap year", () => {
    const grid = buildMonthGrid("2028-02-10", "2028-02-10");
    expect(grid.filter((d) => d.inMonth)).toHaveLength(29);
  });
});

describe("gridRange", () => {
  it("returns an exclusive end one day past the last visible day", () => {
    const grid = buildMonthGrid("2026-10-15", "2026-10-15");
    const { from, toExclusive } = gridRange(grid);

    expect(from).toBe(grid[0].date);
    // The API's `to` is exclusive, so the last visible day must fall inside the range.
    expect(toExclusive).toBe(addDays(grid[grid.length - 1].date, 1));
    expect(grid[grid.length - 1].date < toExclusive).toBe(true);
  });
});

describe("weekDays", () => {
  it("returns the Sunday-to-Saturday week containing the date", () => {
    const days = weekDays("2026-10-14", "2026-10-14"); // a Wednesday
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-10-11");
    expect(days[6].date).toBe("2026-10-17");
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });

  it("spans a month boundary without losing days", () => {
    const days = weekDays("2026-11-01", "2026-11-01"); // a Sunday
    expect(days[0].date).toBe("2026-11-01");
    expect(days[6].date).toBe("2026-11-07");
  });
});

describe("groupByDate", () => {
  const appt = (title: string, startAtLocal: string) => ({ title, startAtLocal });

  it("groups by start date and sorts within a day", () => {
    const map = groupByDate([
      appt("afternoon", "2026-10-12T15:00:00-07:00"),
      appt("morning", "2026-10-12T09:00:00-07:00"),
      appt("next day", "2026-10-13T10:00:00-07:00"),
    ]);

    expect([...map.keys()].sort()).toEqual(["2026-10-12", "2026-10-13"]);
    expect(map.get("2026-10-12")?.map((a) => a.title)).toEqual(["morning", "afternoon"]);
    expect(map.get("2026-10-13")?.map((a) => a.title)).toEqual(["next day"]);
  });

  it("puts a booking that crosses midnight on the day it starts", () => {
    const map = groupByDate([appt("overnight", "2026-10-12T23:00:00-07:00")]);
    expect([...map.keys()]).toEqual(["2026-10-12"]);
  });

  it("returns an empty map for no input", () => {
    expect(groupByDate([]).size).toBe(0);
  });
});

describe("cellContents", () => {
  it("passes through when everything fits", () => {
    expect(cellContents(["a", "b"], 2)).toEqual({ shown: ["a", "b"], hiddenCount: 0 });
    expect(cellContents(["a"], 2)).toEqual({ shown: ["a"], hiddenCount: 0 });
  });

  it("truncates and reports the remainder", () => {
    // The count and the slice come from one place, so they cannot disagree.
    expect(cellContents(["a", "b", "c", "d"], 2)).toEqual({
      shown: ["a", "b"],
      hiddenCount: 2,
    });
  });

  it("handles nothing at all", () => {
    expect(cellContents(undefined, 2)).toEqual({ shown: [], hiddenCount: 0 });
    expect(cellContents([], 2)).toEqual({ shown: [], hiddenCount: 0 });
  });
});
