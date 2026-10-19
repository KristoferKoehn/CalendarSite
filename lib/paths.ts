/**
 * The surfaces either side of the calendar's front door, and a way to address pages inside it.
 *
 * The calendar is mounted under a prefix rather than at the root, because the root is the
 * portfolio.
 */

/**
 * The portfolio. Where "back to portfolio" points from inside the calendar.
 */
export const PORTFOLIO = "/";

/**
 * Site administration: projects, the file shelf and the downloads inventory.
 *
 * Not under `/calendar`, because none of it is about the calendar. A project is a card on the
 * portfolio; a file is a link somebody was given; a download is an archive a card hands over. The
 * calendar happens to be one of the projects, which is the only thing the two have in common — and
 * putting its address in front of theirs said otherwise.
 */
export const ADMIN = "/admin";

/**
 * Build a path inside the admin area.
 *
 *     adminPath("/projects") -> "/admin/projects"
 *
 * The same reasoning as `cal`: written for the targets that are built rather than typed, so the prefix
 * is applied in one place instead of remembered at each call site.
 */
export function adminPath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`adminPath() needs a leading slash, got ${JSON.stringify(path)}`);
  }
  return path === "/" ? ADMIN : `${ADMIN}${path}`;
}

/** The calendar's own root. Visiting it sends you on to the surface below. */
export const CALENDAR = "/calendar";

/**
 * Build a path inside the calendar.
 *
 *     cal("/today")                        -> "/calendar/today"
 *     cal(`/appointments/${id}/reschedule`) -> "/calendar/appointments/<id>/reschedule"
 *
 * Written for the links whose target is built rather than typed. Three of them were missed when the
 * calendar moved under a prefix and went on pointing at the old flat routes — a Book button, a
 * Reschedule button and the month view's day links — because a rewrite of string literals cannot
 * see into a template literal. Going through a function means the prefix is applied wherever it is
 * used rather than remembered at each call site.
 *
 * The portfolio root is `/`, so there is no equivalent for it: a page there is a literal.
 */
export function cal(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`cal() needs a leading slash, got ${JSON.stringify(path)}`);
  }
  // The calendar's own root is a path in its own right, not a prefix with an empty tail.
  return path === "/" ? CALENDAR : `${CALENDAR}${path}`;
}
