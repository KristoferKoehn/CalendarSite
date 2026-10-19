import { describe, expect, it } from "vitest";
import { canDisplay, contentTypeFor, extensionOf, fileHref, isFileName } from "@/lib/files";

/**
 * The file shelf's rules.
 *
 * Two things matter here. The name is joined onto a directory before it is read, so what it may
 * contain is the whole of the safety. And whether a file is displayed or downloaded decides whether it
 * can execute on this origin — which is the same origin as the session token.
 */

describe("isFileName", () => {
  it("accepts the names this service writes", () => {
    for (const name of ["logo.png", "Hexard-Press-Kit.zip", "a_b-c.d.txt", "3.png", "a".repeat(120)]) {
      expect(isFileName(name)).toBe(true);
    }
  });

  it("refuses anything that is not a plain name", () => {
    // Each of these would be either a path or a name that has to be escaped to appear in a URL.
    for (const bad of [
      "",
      ".",
      "..",
      "a..b",
      "../secret.json",
      "a/b",
      "a\\b",
      "a b",
      ".hidden",
      "-leading",
      "a".repeat(121),
      "ümlaut.pdf",
    ]) {
      expect(isFileName(bad)).toBe(false);
    }
  });
});

describe("fileHref", () => {
  it("is a path on this site", () => {
    expect(fileHref("logo.png")).toBe("/files/logo.png");
  });

  it("is absolute when an origin is given, because these are made to be pasted", () => {
    expect(fileHref("logo.png", "https://example.test")).toBe("https://example.test/files/logo.png");
  });

  it("does not double the slash of an origin that ends with one", () => {
    expect(fileHref("logo.png", "https://example.test/")).toBe("https://example.test/files/logo.png");
  });

  it("escapes a name that needs it, rather than trusting it", () => {
    // Names are sanitised on upload, so this cannot normally happen — but a link built from an
    // unexpected name must not become a different URL.
    expect(fileHref("a?b.png")).toBe("/files/a%3Fb.png");
  });
});

describe("contentTypeFor", () => {
  it("names the types worth naming", () => {
    expect(contentTypeFor("shot.png")).toBe("image/png");
    expect(contentTypeFor("kit.zip")).toBe("application/zip");
    expect(contentTypeFor("notes.md")).toBe("text/plain; charset=utf-8");
    expect(contentTypeFor("SHOUT.PNG")).toBe("image/png");
  });

  it("falls back to something a browser downloads rather than guesses at", () => {
    expect(contentTypeFor("thing.xyz")).toBe("application/octet-stream");
    expect(contentTypeFor("noext")).toBe("application/octet-stream");
  });
});

describe("canDisplay", () => {
  it("lets pictures and documents be shown", () => {
    for (const name of ["a.png", "a.jpg", "a.gif", "a.webp", "a.pdf", "a.txt", "a.csv", "a.json"]) {
      expect(canDisplay(name)).toBe(true);
    }
  });

  it("refuses anything that can run", () => {
    // The important cases: an SVG and an HTML file are both documents that execute script, and they
    // would execute on this origin. Served as attachments they are just files.
    for (const name of ["logo.svg", "page.html", "app.js", "thing.zip", "binary", "sh.sh"]) {
      expect(canDisplay(name)).toBe(false);
    }
  });
});

describe("extensionOf", () => {
  it("reads the last segment", () => {
    expect(extensionOf("a.b.c.png")).toBe("png");
    expect(extensionOf("archive.tar.gz")).toBe("gz");
  });

  it("has nothing for a hidden file or no dot", () => {
    expect(extensionOf(".hidden")).toBe("");
    expect(extensionOf("plain")).toBe("");
  });
});
