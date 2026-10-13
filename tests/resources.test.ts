import { describe, expect, it } from "vitest";
import type { Resource } from "@/contract";
import { sortResources } from "@/lib/resources";

function resource(name: string): Resource {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    description: null,
    timezone: "America/Los_Angeles",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("sortResources", () => {
  it("is alphabetical", () => {
    const sorted = sortResources([resource("Studio"), resource("Atrium"), resource("Boardroom")]);
    expect(sorted.map((r) => r.name)).toEqual(["Atrium", "Boardroom", "Studio"]);
  });

  it("ignores case, so a lowercase name does not sort after every capital", () => {
    // Plain string comparison would order "Zebra" before "atrium", because every capital
    // letter precedes every lowercase one. That is the bug this guards.
    const sorted = sortResources([resource("Zebra Room"), resource("atrium"), resource("Breakout")]);
    expect(sorted.map((r) => r.name)).toEqual(["atrium", "Breakout", "Zebra Room"]);
  });

  it("does not mutate the list it was given", () => {
    // The caller keeps this in state; sorting in place would reorder their array behind
    // their back.
    const original = [resource("Beta"), resource("Alpha")];
    const snapshot = original.map((r) => r.name);
    sortResources(original);
    expect(original.map((r) => r.name)).toEqual(snapshot);
  });

  it("is deterministic for names that differ only by case", () => {
    // The comparator has to be transitive for sort to mean anything. Intl's
    // `sensitivity: "base"` is not: comparing "Room B" to "room b" returns 0 one way and 1
    // the other, so the result depended on argument order. Folding case explicitly fixes
    // that, and both input orders must now agree.
    const one = sortResources([resource("Room B"), resource("room b")]);
    const other = sortResources([resource("room b"), resource("Room B")]);
    expect(one.map((r) => r.name)).toEqual(["Room B", "room b"]);
    expect(other.map((r) => r.name)).toEqual(["Room B", "room b"]);
  });

  it("handles nothing at all", () => {
    expect(sortResources([])).toEqual([]);
  });

  it("leaves a single resource alone", () => {
    expect(sortResources([resource("Only")]).map((r) => r.name)).toEqual(["Only"]);
  });
});
