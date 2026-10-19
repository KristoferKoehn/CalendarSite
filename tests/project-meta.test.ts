import { describe, expect, it } from "vitest";
import { indexLabel, notableStatus, projectMeta } from "@/lib/project-meta";

/**
 * The small print on a project row. These are the rules that decide whether a line exists at all, which
 * is the part that makes a list look deliberate rather than assembled.
 */

describe("the meta line", () => {
  it("joins the stack and the year", () => {
    expect(projectMeta({ stack: ["Godot", "GDScript", "WebAssembly"], when: "2026" })).toBe(
      "Godot · GDScript · WebAssembly · 2026",
    );
  });

  it("does not leave a separator when there is no year", () => {
    expect(projectMeta({ stack: ["Go", "Postgres"], when: "" })).toBe("Go · Postgres");
  });

  it("does not leave a separator when there is no stack", () => {
    // The case that used to leave a year stranded at the far right of an otherwise empty row.
    expect(projectMeta({ stack: [], when: "2026" })).toBe("2026");
  });

  it("has nothing to say when there is nothing to say", () => {
    // Null rather than an empty string, so the row omits the line instead of reserving space for it.
    expect(projectMeta({ stack: [], when: "" })).toBeNull();
    expect(projectMeta({ stack: ["  "], when: "   " })).toBeNull();
  });

  it("drops blank entries rather than printing empty separators", () => {
    expect(projectMeta({ stack: ["Go", "", "  "], when: "2026" })).toBe("Go · 2026");
  });

  it("trims what it is given", () => {
    expect(projectMeta({ stack: [" Go "], when: " 2026 " })).toBe("Go · 2026");
  });
});

describe("which statuses are shown", () => {
  it("says nothing for live, because it is the normal case", () => {
    // Repeating "live" down the page draws the eye to the one thing needing no attention.
    expect(notableStatus("live")).toBe(false);
  });

  it("flags the exceptions", () => {
    expect(notableStatus("soon")).toBe(true);
    expect(notableStatus("archived")).toBe(true);
  });
});

describe("the index number", () => {
  it("is two digits, so the column does not shift at ten", () => {
    expect(indexLabel(0)).toBe("01");
    expect(indexLabel(9)).toBe("10");
    expect(indexLabel(10)).toBe("11");
  });

  it("keeps counting past a hundred rather than overflowing the column", () => {
    expect(indexLabel(99)).toBe("100");
  });
});
