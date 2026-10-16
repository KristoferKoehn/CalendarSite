/**
 * The surfaces either side of the calendar's front door.
 *
 * The calendar is mounted under a prefix rather than at the root, because the root is the
 * portfolio. Only what is genuinely shared is here: the prefix itself lives in the route paths.
 */

/** The portfolio. Where "back to portfolio" points from inside the calendar. */
export const PORTFOLIO = "/";

/** The calendar's own root. Visiting it sends you on to the surface below. */
export const CALENDAR = "/calendar";
