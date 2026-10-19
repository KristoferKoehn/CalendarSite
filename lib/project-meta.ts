import type { Project, ProjectStatus } from "@/contract";

/**
 * The small print on a project row.
 *
 * Kept out of the component so the rules can be tested: what belongs on the line under a description,
 * and which statuses are worth saying at all.
 */

/**
 * The stack and the year as one line: "Godot · GDScript · WebAssembly · 2026".
 *
 * Joined rather than positioned at opposite ends of the row. A stack at the left and a year at the far
 * right looks like two columns of a table that happens to be mostly empty — and when a project has no
 * stack, the year is left stranded at the edge with nothing to balance it.
 *
 * Returns null when there is nothing to say, so a row can leave the line out entirely instead of
 * reserving space for a blank one.
 */
export function projectMeta(project: Pick<Project, "stack" | "when">): string | null {
  const parts = [...project.stack.map((entry) => entry.trim()).filter(Boolean)];
  const year = project.when.trim();
  if (year) parts.push(year);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Whether a status is worth showing.
 *
 * "live" is the normal case and saying it on every row is noise — it draws the eye to the one thing
 * that needs no attention. A project that is not live is the exception worth flagging.
 */
export function notableStatus(status: ProjectStatus): boolean {
  return status !== "live";
}

/** The index number shown against a row: 01, 02, 03. */
export function indexLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}
