/**
 * The projects shown on the landing page.
 *
 * A plain array rather than a CMS or a data layer. Adding a project is adding an object, which is
 * the whole of what this page needs to know: a name, where it goes, what state it is in, and a
 * sentence or two saying what it is.
 *
 * `href` is optional on purpose — a project that is not live yet should be readable without being
 * a dead link, and a status of "soon" with an href pointing nowhere is worse than no link at all.
 */
export type ProjectStatus = "live" | "soon" | "archived";

export interface Project {
  name: string;
  /** Omitted when there is nowhere to send anyone yet. */
  href?: string;
  status: ProjectStatus;
  /** What it is, in a sentence or two. This is the only place the pitch lives. */
  description: string;
  /** What it covers, for someone skimming. */
  scope: string[];
  /** What it is built with. */
  stack: string[];
  /** Roughly when. Month and year, or just a year. */
  when: string;
}

export const PROJECTS: Project[] = [
  {
    name: "CalendarSite",
    href: "/calendar",
    status: "live",
    description:
      "Room and appointment booking for a working fitness studio. Eight rooms on a staggered " +
      "timetable, a wall display that keeps itself current without anyone touching it, and an " +
      "agent-facing API that enforces the same rules the interface does.",
    scope: ["Bookings", "Availability", "Kiosk display", "Agent API"],
    stack: ["TypeScript", "Go", "Postgres"],
    when: "2026",
  },
];

/** Display text for each status, kept next to the type so the two cannot drift. */
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: "live",
  soon: "soon",
  archived: "archived",
};
