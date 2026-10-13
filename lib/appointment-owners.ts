import type { Appointment } from "@/contract";
import { appointmentOwnerLabel } from "@/contract";

/** One owner appearing in the current appointments. */
export type OwnerOption = {
  /** The denormalised address, which is the durable identity: `userId` may match no user. */
  email: string;
  label: string;
  count: number;
};

/**
 * The owners present in a list of appointments, for the owner filter.
 *
 * Built from the appointments rather than from `GET /users`, because that endpoint is
 * admin-only while every authenticated user can read every appointment. Deriving it keeps
 * the filter available to everyone and avoids listing people who have never booked.
 */
export function ownerOptions(appointments: Appointment[]): OwnerOption[] {
  const byEmail = new Map<string, OwnerOption>();

  for (const appointment of appointments) {
    const email = appointment.ownerEmail;
    const existing = byEmail.get(email);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byEmail.set(email, {
      email,
      label: appointmentOwnerLabel(appointment),
      count: 1,
    });
  }

  return [...byEmail.values()].sort((a, b) => {
    const left = a.label.toLowerCase();
    const right = b.label.toLowerCase();
    if (left !== right) return left < right ? -1 : 1;
    return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
  });
}
