import { cache } from "react";
import { projectListSchema, type Project } from "@/contract";

/**
 * The portfolio, fetched from the API at request time.
 *
 * This read used to come straight off disk, from the directory the backend writes. That worked, and
 * it coupled the two services to a shared path — but it cannot be built: Turbopack follows a
 * filesystem read with a statically-known path and treats what it finds as build inputs. With the
 * directory empty the build passes, and as soon as a project is published the build fails with
 * "Path C:/sites/projects/calendarsite.json could not be resolved because a component does not
 * exist". The failure arrived the moment the first project existed, which is the worst possible
 * time for a deploy to stop working.
 *
 * Going through the API removes the problem rather than hiding it: there is no filesystem path for
 * the bundler to trace, the web app no longer needs read access to another service's data directory,
 * and the rules about what a project is live in one place. The backend already skips a document it
 * cannot parse, which is where that belonged anyway.
 *
 * `API_INTERNAL_URL` is for a deployment where the web app should talk to the backend over loopback
 * instead of going out through the public hostname and back.
 */
const API_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Every published project, newest first.
 *
 * A failure returns an empty list rather than throwing. A front page that renders "nothing published"
 * while the API is down is wrong, but it is a quieter wrong than an error page where a portfolio
 * should be — and the alternative, crashing the shell, takes the whole page with it.
 *
 * Wrapped in React's `cache`, which shares one result across a single render. The page asks twice — once
 * for the order of the rows, once for the count in the section header — and without this that would be
 * two requests to the API for the same list. It is request-scoped, not a cache: a later visit fetches
 * again, which is the point.
 */
export const readProjects = cache(async (): Promise<Project[]> => {
  if (!API_URL) return [];

  try {
    // Not cached by fetch either. A project published through the admin form is meant to appear on the
    // next visit, and caching here would restore exactly the staleness this feature exists to remove.
    const response = await fetch(`${API_URL}/projects`, { cache: "no-store" });
    if (!response.ok) return [];
    const parsed = projectListSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.projects : [];
  } catch {
    return [];
  }
});
