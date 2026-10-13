import { describe, expect, it } from "vitest";
import type { Appointment } from "@/contract";
import {
  DEFAULT_APPOINTMENT_SORT,
  isAppointmentSort,
  sortAppointments,
} from "@/lib/appointment-sort";
import { ownerOptions } from "@/lib/appointment-owners";

function appointment(over: Partial<Appointment> & { id: string }): Appointment {
  return {
    userId: "u1",
    ownerEmail: "owner@example.com",
    ownerName: null,
    resourceId: "r1",
    title: "Booking",
    // Required by the schema, and an empty string is what "no description" looks like.
    description: "",
    startAt: "2026-10-12T17:00:00Z",
    endAt: "2026-10-12T18:00:00Z",
    startAtLocal: "2026-10-12T10:00:00-07:00",
    endAtLocal: "2026-10-12T11:00:00-07:00",
    status: "booked",
    cancelledAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...over,
  };
}

const titles = (list: Appointment[]) => list.map((a) => a.title);

describe("sortAppointments", () => {
  const early = appointment({
    id: "a",
    title: "Early",
    startAtLocal: "2026-10-12T09:00:00-07:00",
    createdAt: "2026-10-05T00:00:00Z",
  });
  const late = appointment({
    id: "b",
    title: "Late",
    startAtLocal: "2026-10-12T17:00:00-07:00",
    createdAt: "2026-10-01T00:00:00Z",
  });
  const middle = appointment({
    id: "c",
    title: "Middle",
    startAtLocal: "2026-10-12T13:00:00-07:00",
    createdAt: "2026-10-03T00:00:00Z",
  });

  it("defaults to soonest first", () => {
    const sorted = sortAppointments([late, early, middle], DEFAULT_APPOINTMENT_SORT);
    expect(titles(sorted)).toEqual(["Early", "Middle", "Late"]);
  });

  it("sorts latest first when asked", () => {
    expect(titles(sortAppointments([early, late, middle], "latest"))).toEqual([
      "Late",
      "Middle",
      "Early",
    ]);
  });

  it("sorts by title, case-insensitively", () => {
    // Plain comparison would put "apple" after "Zebra", since every capital precedes every
    // lowercase letter.
    const a = appointment({ id: "x", title: "apple", startAtLocal: "2026-10-12T09:00:00-07:00" });
    const z = appointment({ id: "y", title: "Zebra", startAtLocal: "2026-10-12T09:00:00-07:00" });
    expect(titles(sortAppointments([z, a], "title"))).toEqual(["apple", "Zebra"]);
  });

  it("sorts by creation, newest first", () => {
    expect(titles(sortAppointments([middle, late, early], "created"))).toEqual([
      "Early",
      "Middle",
      "Late",
    ]);
  });

  it("compares start times as instants across offsets", () => {
    // 09:00 in Seattle is 16:00Z, which is later than 08:00Z. Written with different
    // offsets, both must still land in instant order.
    const seattle = appointment({ id: "s", title: "Seattle", startAtLocal: "2026-10-12T09:00:00-07:00" });
    const utc = appointment({ id: "u", title: "UTC", startAtLocal: "2026-10-12T08:00:00Z" });
    expect(titles(sortAppointments([seattle, utc], "soonest"))).toEqual(["UTC", "Seattle"]);
  });

  it("breaks ties on the title so the order is stable", () => {
    const b = appointment({ id: "1", title: "Beta", startAtLocal: "2026-10-12T09:00:00-07:00" });
    const a = appointment({ id: "2", title: "Alpha", startAtLocal: "2026-10-12T09:00:00-07:00" });
    expect(titles(sortAppointments([b, a], "soonest"))).toEqual(["Alpha", "Beta"]);
    expect(titles(sortAppointments([a, b], "soonest"))).toEqual(["Alpha", "Beta"]);
  });

  it("does not mutate the list it was given", () => {
    const original = [late, early];
    const snapshot = titles(original);
    sortAppointments(original, "soonest");
    expect(titles(original)).toEqual(snapshot);
  });

  it("handles an empty list", () => {
    expect(sortAppointments([], "soonest")).toEqual([]);
  });
});

describe("isAppointmentSort", () => {
  it("accepts the known orders and rejects anything else", () => {
    expect(isAppointmentSort("soonest")).toBe(true);
    expect(isAppointmentSort("created")).toBe(true);
    expect(isAppointmentSort("sideways")).toBe(false);
    expect(isAppointmentSort(null)).toBe(false);
    expect(isAppointmentSort(undefined)).toBe(false);
    expect(isAppointmentSort(7)).toBe(false);
  });
});

describe("ownerOptions", () => {
  it("lists each owner once with a count", () => {
    const list = [
      appointment({ id: "1", ownerEmail: "b@example.com", ownerName: "Bea" }),
      appointment({ id: "2", ownerEmail: "a@example.com", ownerName: "Al" }),
      appointment({ id: "3", ownerEmail: "b@example.com", ownerName: "Bea" }),
    ];
    expect(ownerOptions(list)).toEqual([
      { email: "a@example.com", label: "Al", count: 1 },
      { email: "b@example.com", label: "Bea", count: 2 },
    ]);
  });

  it("falls back to the address when there is no display name", () => {
    // The address is the durable identity: a deleted owner leaves it behind on purpose.
    const options = ownerOptions([appointment({ id: "1", ownerEmail: "gone@example.com", ownerName: null })]);
    expect(options).toEqual([{ email: "gone@example.com", label: "gone@example.com", count: 1 }]);
  });

  it("returns nothing for no appointments", () => {
    expect(ownerOptions([])).toEqual([]);
  });
});
