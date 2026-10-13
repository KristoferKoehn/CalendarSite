import type { Appointment } from "@/contract";

/**
 * The orders the appointment list can be read in.
 *
 * Sorting happens here rather than at the API for now: the endpoint takes no `sort`
 * parameter, and every row is already in the browser because the list is not paginated.
 */
export const APPOINTMENT_SORTS = ["soonest", "latest", "title", "created"] as const;
export type AppointmentSort = (typeof APPOINTMENT_SORTS)[number];

export const APPOINTMENT_SORT_LABELS: Record<AppointmentSort, string> = {
  soonest: "Starting soonest",
  latest: "Starting latest",
  title: "Title A–Z",
  created: "Recently added",
};

export const DEFAULT_APPOINTMENT_SORT: AppointmentSort = "soonest";

export function isAppointmentSort(value: unknown): value is AppointmentSort {
  return (
    typeof value === "string" &&
    (APPOINTMENT_SORTS as readonly string[]).includes(value)
  );
}

/**
 * Sort a copy of the appointments.
 *
 * Compares `startAtLocal` as a string. Those are ISO 8601 with a zero-padded date and time,
 * so lexical order is chronological order — and unlike `Date.parse` it cannot be thrown off
 * by an unparseable value. Ties break on the title so the order is stable rather than
 * depending on the order the API happened to return.
 *
 * Returns a copy: the caller keeps this in state, and sorting in place would mutate it.
 */
export function sortAppointments(
  appointments: Appointment[],
  sort: AppointmentSort,
): Appointment[] {
  const byStart = (a: Appointment, b: Appointment) =>
    a.startAtLocal.localeCompare(b.startAtLocal);
  const byTitle = (a: Appointment, b: Appointment) => {
    const left = a.title.toLowerCase();
    const right = b.title.toLowerCase();
    // Explicit case-folded compare rather than localeCompare with sensitivity, which is not
    // transitive and so makes the result depend on argument order.
    if (left !== right) return left < right ? -1 : 1;
    return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
  };

  return appointments.slice().sort((a, b) => {
    switch (sort) {
      case "latest": {
        const byStartDesc = byStart(b, a);
        return byStartDesc !== 0 ? byStartDesc : byTitle(a, b);
      }
      case "title":
        return byTitle(a, b) !== 0 ? byTitle(a, b) : byStart(a, b);
      case "created": {
        const byCreated = b.createdAt.localeCompare(a.createdAt);
        return byCreated !== 0 ? byCreated : byStart(a, b);
      }
      case "soonest":
      default: {
        const byStartAsc = byStart(a, b);
        return byStartAsc !== 0 ? byStartAsc : byTitle(a, b);
      }
    }
  });
}
