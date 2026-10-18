import { describe, expect, it } from "vitest";
import { projectDraftSchema } from "@/contract";

/**
 * The admin form's validation.
 *
 * These exist because the form was refusing to submit with the link left empty, which is the field's
 * stated default: `href` was declared `.optional()` but given a validator that an empty string fails,
 * and `.optional()` only forgives `undefined`. The form's own initial value is `""`, so "leave it
 * blank" could never pass.
 */

const base = {
  name: "Match 3",
  slug: "",
  description: "A gem-matching puzzle game.",
  status: "live" as const,
  stack: "Godot, GDScript",
  when: "2026",
};

const issueFor = (input: unknown) => {
  const parsed = projectDraftSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join("; ");
};

describe("the optional link", () => {
  it("accepts an empty string, which is what the form starts with", () => {
    expect(issueFor({ ...base, href: "" })).toBeNull();
  });

  it("accepts it left out entirely", () => {
    expect(issueFor({ ...base })).toBeNull();
  });

  it("accepts a path", () => {
    expect(issueFor({ ...base, href: "/games/match-3/" })).toBeNull();
  });

  it("still refuses a path that does not start with a slash", () => {
    expect(issueFor({ ...base, href: "games/match-3/" })).toContain("slash");
  });

  it("still refuses a protocol-relative address", () => {
    expect(issueFor({ ...base, href: "//example.com" })).toContain("slash");
  });

  it("still refuses an address that climbs out", () => {
    expect(issueFor({ ...base, href: "/games/../../etc" })).toContain("..");
  });
});

describe("the optional address", () => {
  it("accepts an empty string, meaning derive it from the title", () => {
    expect(issueFor({ ...base, slug: "" })).toBeNull();
  });

  it("accepts lower-case letters, digits and hyphens", () => {
    expect(issueFor({ ...base, slug: "match-3" })).toBeNull();
  });

  it("refuses capitals and spaces, which would not be a valid path", () => {
    expect(issueFor({ ...base, slug: "Match 3" })).not.toBeNull();
  });
});

describe("the required fields", () => {
  it("needs a title", () => {
    expect(issueFor({ ...base, name: "  " })).toContain("title");
  });

  it("needs a description", () => {
    expect(issueFor({ ...base, description: "" })).toContain("description");
  });

  it("needs a known status", () => {
    expect(issueFor({ ...base, status: "published" })).not.toBeNull();
  });

  it("accepts the three statuses the card can show", () => {
    for (const status of ["live", "soon", "archived"] as const) {
      expect(issueFor({ ...base, status })).toBeNull();
    }
  });
});
