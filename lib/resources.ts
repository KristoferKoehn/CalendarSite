import type { Resource } from "@/contract";

/**
 * Alphabetical by name, for display.
 *
 * Case-insensitive, because plain string comparison orders every capital before every
 * lowercase letter and would sort "atrium" after "Zebra".
 *
 * Ties break on the name as written, matching the backend's `ORDER BY lower(name), name`,
 * so two names differing only by case do not come out in whatever order they happened to
 * arrive.
 *
 * Returns a copy: callers hold this in state, and sorting in place would mutate it.
 */
export function sortResources(resources: Resource[]): Resource[] {
  return resources.slice().sort((a, b) => {
    // Fold case explicitly rather than using Intl's `sensitivity: "base"`. That option is
    // not transitive — comparing "Room B" to "room b" returns 0 one way and 1 the other —
    // and an inconsistent comparator makes sort's result arbitrary. toLowerCase is
    // transitive, which is what a comparison needs to be.
    const left = a.name.toLowerCase();
    const right = b.name.toLowerCase();
    if (left !== right) return left < right ? -1 : 1;
    // Same apart from case: break on the name as written, matching the backend's
    // `ORDER BY lower(name), name`, so the order is deterministic.
    if (a.name === b.name) return 0;
    return a.name < b.name ? -1 : 1;
  });
}
