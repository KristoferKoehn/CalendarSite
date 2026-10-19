import { describe, expect, it } from "vitest";
import { hasMarkup, parseInline, parseParagraphs, safeHref } from "@/lib/rich-text";

/**
 * A little markdown for project descriptions.
 *
 * Two things are worth testing here and one of them is not cosmetic: a description becomes markup on a
 * page that shares an origin with the calendar, so what may become a link is a security decision, not a
 * formatting one.
 */

describe("what may become a link", () => {
  it("accepts a path on this site", () => {
    expect(safeHref("/calendar")).toBe("/calendar");
    expect(safeHref("/games/hexard/")).toBe("/games/hexard/");
  });

  it("accepts an absolute http or https address", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("http://example.com/a?b=c")).toBe("http://example.com/a?b=c");
  });

  it("refuses anything that would run script", () => {
    // The reason this function exists at all.
    for (const bad of [
      "javascript:alert(1)",
      "javascript:alert(1)//",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
    ]) {
      expect(safeHref(bad)).toBeNull();
    }
  });

  it("refuses a protocol-relative address, which is absolute in disguise", () => {
    expect(safeHref("//example.com")).toBeNull();
  });

  it("refuses a path that climbs out", () => {
    expect(safeHref("/../etc/passwd")).toBeNull();
  });

  it("refuses anything relative, since a card is read from more than one address", () => {
    expect(safeHref("calendar")).toBeNull();
    expect(safeHref("example.com")).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
  });

  it("refuses an address with whitespace inside it", () => {
    expect(safeHref("https://example.com/a b")).toBeNull();
  });
});

describe("parsing a description", () => {
  it("leaves plain prose alone", () => {
    expect(parseInline("A gem-matching puzzle game.")).toEqual([
      { kind: "text", text: "A gem-matching puzzle game." },
    ]);
  });

  it("finds a link", () => {
    expect(parseInline("See [the calendar](/calendar) for more.")).toEqual([
      { kind: "text", text: "See " },
      { kind: "link", text: "the calendar", href: "/calendar" },
      { kind: "text", text: " for more." },
    ]);
  });

  it("leaves the markup visible when the address is refused", () => {
    // The reader is not given a link that would do something unexpected, and the writer can see that
    // it did not take: better than silently showing only the words and leaving them puzzled.
    expect(parseInline("[click](javascript:alert)")).toEqual([
      { kind: "text", text: "[click](javascript:alert)" },
    ]);
    // With a nested bracket the match stops at the first `)`, so the remainder stays as text — the
    // important part is that no link node is produced.
    const nested = parseInline("[click](javascript:alert(1))");
    expect(nested.every((node) => node.kind === "text")).toBe(true);
  });

  it("finds bold and code", () => {
    expect(parseInline("a **strong** word")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", text: "strong" },
      { kind: "text", text: " word" },
    ]);
    expect(parseInline("run `mix test`")).toEqual([
      { kind: "text", text: "run " },
      { kind: "code", text: "mix test" },
    ]);
  });

  it("does not mangle a sentence with a single asterisk", () => {
    // Delimiters are matched at the cursor, so one stray asterisk is just a character.
    expect(parseInline("2 * 3 = 6")).toEqual([{ kind: "text", text: "2 * 3 = 6" }]);
  });

  it("leaves an unclosed link as text rather than swallowing the rest", () => {
    expect(parseInline("see [this](/calendar")).toEqual([{ kind: "text", text: "see [this](/calendar" }]);
  });

  it("handles more than one thing in a line", () => {
    const nodes = parseInline("**A** [b](/c) `d`");
    expect(nodes.map((n) => n.kind)).toEqual(["strong", "text", "link", "text", "code"]);
  });
});

describe("paragraphs", () => {
  it("splits on a blank line", () => {
    const paragraphs = parseParagraphs("one\n\ntwo");
    expect(paragraphs).toHaveLength(2);
  });

  it("does not split on a single newline", () => {
    // Wrapping a long line while typing must not decide where a paragraph breaks.
    expect(parseParagraphs("one\ntwo")).toEqual([[{ kind: "text", text: "one two" }]]);
  });

  it("drops empty paragraphs from stray blank lines", () => {
    expect(parseParagraphs("\n\none\n\n\n\ntwo\n\n")).toHaveLength(2);
  });

  it("returns nothing for an empty description", () => {
    expect(parseParagraphs("")).toEqual([]);
    expect(parseParagraphs("   \n\n  ")).toEqual([]);
  });
});

describe("hasMarkup", () => {
  it("recognises the three things that are rendered", () => {
    expect(hasMarkup("[a](/b)")).toBe(true);
    expect(hasMarkup("**a**")).toBe(true);
    expect(hasMarkup("`a`")).toBe(true);
  });

  it("does not fire on prose", () => {
    expect(hasMarkup("A plain sentence.")).toBe(false);
    expect(hasMarkup("2 * 3")).toBe(false);
  });
});
