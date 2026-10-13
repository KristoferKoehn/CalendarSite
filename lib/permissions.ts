import type { Appointment, User } from "@/contract";

/**
 * Whether the signed-in user may change this appointment at all — cancel or
 * reschedule. Mirrors the server's rule: the owner, or any admin.
 *
 * This is presentation only. The server enforces the same rule regardless of what is
 * rendered, so hiding a control is a convenience rather than a boundary.
 */
export function canModifyAppointment(appointment: Appointment, user: User | null): boolean {
  if (!user) return false;
  return appointment.userId === user.id || user.role === "admin";
}

/**
 * Whether the signed-in user may delete this appointment outright.
 *
 * Deleting erases the record rather than cancelling it, and the server restricts that
 * to admins — including for the owner. So this is deliberately narrower than
 * `canModifyAppointment`: it does not grant the owner anything.
 */
export function canDeleteAppointment(user: User | null): boolean {
  return user?.role === "admin";
}
