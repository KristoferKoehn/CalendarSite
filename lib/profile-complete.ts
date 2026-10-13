import type { User } from "@/contract";

/** Whether the address has been confirmed. This is what gates access. */
export function isVerified(user: User | null | undefined): boolean {
  return Boolean(user?.emailVerifiedAt);
}

/**
 * Whether a user has told us anything about themselves.
 *
 * Not part of the gate. Confirmation is what opens the site; details are asked for on the way
 * in and can be skipped or filled in later from Settings. The display name is the field that
 * changes what others see — without it every booking is attributed to an email address — which
 * is why the details screen asks for it first, not why it should trap somebody.
 */
export function hasProfileDetails(user: User | null | undefined): boolean {
  return Boolean(user?.displayName?.trim());
}
