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
  {
    name: "Match 3",
    // The bare path, which the app router redirects to the export's entry file. `/match3/` on its
    // own is a 308 to nowhere: Next does not serve a directory index for a static folder.
    href: "/match3",
    status: "live",
    description:
      "A gem-matching puzzle game. Swap neighbouring pieces to line up three or more, clear them, " +
      "and keep the board from filling: every move is scored and you have twenty-five of them. " +
      "Built as a single self-contained build that runs in the browser with no install.",
    scope: ["Puzzle", "Score chasing", "Keyboard and touch"],
    stack: ["Godot", "GDScript", "WebAssembly"],
    when: "2026",
  },
];

/** Display text for each status, kept next to the type so the two cannot drift. */
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: "live",
  soon: "soon",
  archived: "archived",
};
