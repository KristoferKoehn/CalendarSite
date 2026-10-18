import { describe, expect, it } from "vitest";
import { archiveHref, archiveSlug } from "@/lib/archives";

/**
 * The address a stored download is served at.
 *
 * The name is the only thing between a request and a filesystem read, so it is parsed strictly: what
 * these reject is a 404, not something to interpret.
 */

describe("archiveSlug", () => {
  it("reads a slug out of the address", () => {
    expect(archiveSlug("hexard.zip")).toBe("hexard");
    expect(archiveSlug("match-3.zip")).toBe("match-3");
  });

  it("refuses a path, which is the whole point", () => {
    for (const bad of [
      "../projects/hexard.json",
      "..%2fhexard.zip",
      "a/hexard.zip",
      "a\\hexard.zip",
      "/hexard.zip",
      "C:hexard.zip",
    ]) {
      expect(archiveSlug(bad)).toBeNull();
    }
  });

  it("refuses anything that is not one of our archives", () => {
    expect(archiveSlug("hexard")).toBeNull();
    expect(archiveSlug("hexard.tar.gz")).toBeNull();
    expect(archiveSlug("hexard.zip.txt")).toBeNull();
    expect(archiveSlug(".zip")).toBeNull();
    expect(archiveSlug(".hidden.zip")).toBeNull();
    expect(archiveSlug("")).toBeNull();
  });

  it("refuses names the backend would never have written", () => {
    expect(archiveSlug("Hexard.zip")).toBeNull();
    expect(archiveSlug("hex ard.zip")).toBeNull();
    expect(archiveSlug("hexard_.zip")).toBeNull();
    expect(archiveSlug("-leading.zip")).toBeNull();
  });

  it("refuses a slug longer than the limit", () => {
    expect(archiveSlug(`${"a".repeat(60)}.zip`)).toBe("a".repeat(60));
    expect(archiveSlug(`${"a".repeat(61)}.zip`)).toBeNull();
  });

  it("accepts digits and hyphens after the first character", () => {
    expect(archiveSlug("a1-b2-c3.zip")).toBe("a1-b2-c3");
    expect(archiveSlug("3.zip")).toBe("3");
  });
});

describe("archiveHref", () => {
  it("is where the card points", () => {
    expect(archiveHref("hexard")).toBe("/downloads/hexard.zip");
  });

  it("round-trips through the parser", () => {
    // The address the writer produces is one the server accepts, or the two would disagree silently.
    expect(archiveSlug(archiveHref("hexard").split("/").pop()!)).toBe("hexard");
  });
});
