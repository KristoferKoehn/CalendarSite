import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ADMIN, CALENDAR, PORTFOLIO, adminPath, cal } from "@/lib/paths";

/**
 * Every navigation target must be prefixed.
 *
 * This exists because three links were missed when the calendar moved under `/calendar` and went on
 * pointing at the old flat routes: the Book button on a room, the Reschedule button on a booking,
 * and the month view's day links. All three built their target from a template literal, and the
 * rewrite that updated everything else only matched plain string literals — so they typechecked,
 * built, and 404ed.
 *
 * A grep is a blunt instrument, but the failure it catches is blunt too, and it is invisible to
 * every other kind of test: the sites are still valid JSX and still render a working-looking link.
 *
 * The check captures *how* each target is written, not only what it says. Seeing the string
 * `/today` is not enough to judge it — the question is whether it went through `cal()`, and a
 * capture that discards that cannot tell the two apart. The first version of this file did discard
 * it and would have passed on the broken code.
 */

const CALENDAR_PREFIX = /^\/calendar(\/|$)/;

/**
 * Destinations that are not the calendar and are legitimately absolute. A bare `/` is the root
 * only — writing it as a bare leading slash would match every path there is and make the check
 * below vacuous.
 */
function isDeliberatelyOutsideTheCalendar(target: string): boolean {
  return /^(\/$|\/calendar(\/|$)|\/admin(\/|$)|\/match3(\/|$)|\/api(\/|$)|#|mailto:|https?:)/.test(target);
}

type Target = { path: string; wrapped: boolean; wrapper: string | null };

/** Navigation targets in a file, with a note of which helper wrapped them, if any. */
function navigationTargets(src: string): Target[] {
  const found: Target[] = [];
  const patterns = [
    /href=\{(\w*)\(?[^"'`]*["'`](\/[^"'`]*)["'`]/g,
    /href=["'`](\/[^"'`]*)["'`]/g,
    /router\.(?:push|replace)\((\w*)\(?[^"'`]*["'`](\/[^"'`]*)["'`]/g,
    /redirect\((\w*)\(?[^"'`]*["'`](\/[^"'`]*)["'`]/g,
  ];
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      // The plain-href pattern has the path in group 1; the others have a wrapper name then a path.
      if (m.length === 2) found.push({ path: m[1], wrapped: false, wrapper: null });
      else found.push({ path: m[2], wrapped: Boolean(m[1]), wrapper: m[1] || null });
    }
  }
  return found;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

describe("cal()", () => {
  it("prefixes a calendar path", () => {
    expect(cal("/today")).toBe("/calendar/today");
    expect(cal("/appointments/new")).toBe("/calendar/appointments/new");
  });

  it("keeps a nested path and its query intact", () => {
    expect(cal("/appointments/abc-123/reschedule")).toBe("/calendar/appointments/abc-123/reschedule");
    expect(cal("/today?d=2026-10-15")).toBe("/calendar/today?d=2026-10-15");
    expect(cal("/appointments/new?resourceId=xyz")).toBe("/calendar/appointments/new?resourceId=xyz");
  });

  it("maps the calendar root to the prefix itself, not to a trailing slash", () => {
    expect(cal("/")).toBe(CALENDAR);
    expect(cal("/")).not.toBe("/calendar/");
  });

  it("refuses a path without a leading slash, rather than inventing one", () => {
    // A missing slash would silently produce "/calendartoday".
    expect(() => cal("today")).toThrow(/leading slash/);
  });
});

describe("navigation targets in the source", () => {
  const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")];

  it("has files to check, so this cannot pass vacuously", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("are all either wrapped in a helper or deliberately outside the calendar", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const { path, wrapper } of navigationTargets(readFileSync(file, "utf8"))) {
        // Any helper is deliberate: `cal` builds a calendar path, `adminPath` an admin one. What this
        // catches is a path typed straight into a link, which is how the three that broke were written.
        if (wrapper) continue;
        if (isDeliberatelyOutsideTheCalendar(path)) continue;
        offenders.push(`${file} -> ${path}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not link to the admin pages at their old calendar addresses", () => {
    // They moved to /admin because none of it is about the calendar. A stale link would still work —
    // the middleware redirects it — which is exactly why it would go unnoticed: the page loads, one
    // hop later, and the address in the code goes on saying the wrong thing.
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const stale of ["/calendar/projects", "/calendar/files", "/calendar/downloads"]) {
        if (src.includes(`"${stale}"`) || src.includes(`\`${stale}\``)) offenders.push(`${file} -> ${stale}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds targets at all, so the patterns are not silently matching nothing", () => {
    const all = files.flatMap((f) => navigationTargets(readFileSync(f, "utf8")));
    expect(all.length).toBeGreaterThan(10);
    expect(all.some((t) => t.wrapped)).toBe(true);
  });

  it("would catch an un-prefixed target, and would accept it once wrapped", () => {
    // The three links that actually broke, in both states.
    const pairs: [string, string][] = [
      ['href={`/appointments/new?resourceId=${resource.id}`}', "href={cal(`/appointments/new?resourceId=${resource.id}`)}"],
      ["href={`/appointments/${appointment.id}/reschedule`}", "href={cal(`/appointments/${appointment.id}/reschedule`)}"],
      ["router.push(`/today?d=${date}`)", "router.push(cal(`/today?d=${date}`))"],
    ];
    for (const [broken, fixed] of pairs) {
      const before = navigationTargets(broken);
      expect(before).toHaveLength(1);
      expect(before[0].wrapped).toBe(false);
      // The guard reports it: not wrapped, and not deliberately outside.
      expect(isDeliberatelyOutsideTheCalendar(before[0].path)).toBe(false);

      const after = navigationTargets(fixed);
      expect(after).toHaveLength(1);
      expect(after[0].path).toBe(before[0].path);
      expect(after[0].wrapped).toBe(true);
    }
  });
});

describe("PORTFOLIO", () => {
  it("is the root, which is where the projects page is served", () => {
    expect(PORTFOLIO).toBe("/");
    expect(CALENDAR_PREFIX.test(PORTFOLIO)).toBe(false);
  });
});

describe("adminPath()", () => {
  it("prefixes an admin path", () => {
    expect(adminPath("/projects")).toBe("/admin/projects");
    expect(adminPath("/files")).toBe("/admin/files");
    expect(adminPath("/downloads")).toBe("/admin/downloads");
  });

  it("maps the admin root to the prefix itself, not to a trailing slash", () => {
    expect(adminPath("/")).toBe(ADMIN);
    expect(adminPath("/")).not.toBe("/admin/");
  });

  it("refuses a path without a leading slash", () => {
    expect(() => adminPath("projects")).toThrow(/leading slash/);
  });

  it("is not under the calendar, which is the point of it", () => {
    // Projects, files and downloads were only ever under /calendar because that was the app the site
    // started as. None of them is about rooms or bookings.
    expect(CALENDAR_PREFIX.test(adminPath("/projects"))).toBe(false);
    expect(ADMIN).not.toBe(CALENDAR);
  });
});
