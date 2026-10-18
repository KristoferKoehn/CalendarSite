import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { projectSchema, type Project } from "@/contract";

/**
 * The portfolio, read from disk at request time.
 *
 * These are the same JSON documents the backend writes when an admin uploads a project, so the two
 * services share one directory and neither keeps its own list. That is the whole point: a project
 * added through the form appears on the landing page without a build, and there is no second place
 * to update.
 *
 * A `node:fs` read means this only works on the server, which is why the landing page renders the
 * list inside a Suspense boundary — see `app/page.tsx`.
 */

/**
 * Where the documents live.
 *
 * The same variable the backend writes to. Outside the repository because these are written at
 * runtime and a deploy is a `git pull`.
 */
const PROJECTS_DIR = process.env.PROJECTS_DIR ?? path.join("C:\\sites", "projects");

/**
 * Read every project, newest first.
 *
 * A document that fails to parse is skipped rather than thrown, for the same reason the backend
 * skips one: a single broken file should cost one card, not the whole page. The alternative — an
 * exception — turns a typo in one file into a landing page that shows an error to every visitor.
 *
 * An unreadable or missing directory is not an error either. On a fresh deployment nothing has been
 * uploaded yet, and "no projects" is a truthful answer that the page already has a branch for.
 */
export async function readProjects(): Promise<Project[]> {
  let names: string[];
  try {
    names = await readdir(PROJECTS_DIR);
  } catch {
    return [];
  }

  const projects: Project[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(PROJECTS_DIR, name), "utf8");
      const parsed = projectSchema.safeParse(JSON.parse(raw));
      if (parsed.success) projects.push(parsed.data);
    } catch {
      // Unreadable, or not JSON. Skipped deliberately — see above.
      continue;
    }
  }

  // Newest first, matching the backend's order. Sorted on `createdAt` rather than `updatedAt`, so
  // correcting a description does not reorder the page.
  projects.sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.name.localeCompare(b.name);
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  return projects;
}
