import { describe, expect, it } from "vitest";
import {
  DARK_CLASS,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  resolveTheme,
  themeBootstrapScript,
  type Theme,
} from "@/lib/theme";

/**
 * The theme preference, and the bootstrap script that applies it before the first paint.
 *
 * The script is the risky part: it cannot import anything, so it repeats the storage key and the
 * class name as literals. If those drift from the module the app uses, the theme would be applied
 * under one key and read under another and the toggle would appear to do nothing on reload — a
 * failure that is invisible until someone reloads a page they just changed.
 */

describe("resolveTheme", () => {
  it("resolves system to the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the OS when a theme is chosen explicitly", () => {
    // The point of the explicit options: they must win over the system setting.
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});

describe("themeBootstrapScript", () => {
  const script = themeBootstrapScript();

  it("uses the same storage key the module reads", () => {
    expect(script).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });

  it("toggles the same class the dark variant is defined on", () => {
    expect(script).toContain(JSON.stringify(DARK_CLASS));
  });

  it("falls back to the system preference when nothing is stored", () => {
    // Otherwise a first-time visitor would get light regardless of their machine, which is a
    // regression: following the OS is what the app did before the toggle existed.
    expect(script).toContain("matchMedia");
    expect(script).toContain("prefers-color-scheme: dark");
  });

  it("is defensive about storage being unavailable", () => {
    // localStorage throws outright in some partitioned or locked-down contexts. Throwing inside a
    // blocking head script would break the page before it renders.
    expect(script).toContain("try");
    expect(script).toContain("catch");
  });

  it("sets color-scheme so browser chrome matches", () => {
    expect(script).toContain("colorScheme");
  });

  it("is a single self-contained expression", () => {
    // It is injected into the document head; anything that returns a value or depends on the
    // module scope would not run correctly there.
    expect(script.startsWith("(function(){")).toBe(true);
    expect(script.trimEnd().endsWith("})();")).toBe(true);
  });
});

describe("the theme options", () => {
  it("labels every option, so none renders blank in Settings", () => {
    for (const theme of ["light", "dark", "system"] as Theme[]) {
      expect(THEME_LABELS[theme]).toBeTruthy();
    }
  });

  it("includes system, because dropping it would be a regression", () => {
    expect(Object.keys(THEME_LABELS)).toContain("system");
  });
});
