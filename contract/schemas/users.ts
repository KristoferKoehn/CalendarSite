import { z } from "zod";
import { emailSchema, isoTimestampSchema, uuidSchema } from "./common";

export const roleSchema = z.enum(["user", "admin"]);
export type Role = z.infer<typeof roleSchema>;

/**
 * A user, including their profile details. Every authenticated user can read
 * every other user's profile (it is a shared directory), so nothing here is
 * private.
 *
 * `birthMonth` and `birthDay` are nullable and always move together. There is
 * deliberately no birth year: the system can recognise a birthday without
 * holding a full date of birth.
 */
export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  // Profile fields are tolerated as absent and normalised to null, so a response
  // from an older build (or a fixture) still parses. The API always sends them.
  displayName: z.string().nullish().transform((v) => v ?? null),
  birthMonth: z.number().int().min(1).max(12).nullish().transform((v) => v ?? null),
  birthDay: z.number().int().min(1).max(31).nullish().transform((v) => v ?? null),
  pronouns: z.string().nullish().transform((v) => v ?? null),
  jobTitle: z.string().nullish().transform((v) => v ?? null),
  bio: z.string().nullish().transform((v) => v ?? null),
  role: roleSchema,
  isAgent: z.boolean(),
  createdAt: isoTimestampSchema,
});
export type User = z.infer<typeof userSchema>;

export const userListOutputSchema = z.object({
  users: z.array(userSchema),
});
export type UserListOutput = z.infer<typeof userListOutputSchema>;

export const updateUserInputSchema = z
  .object({
    role: roleSchema.optional(),
    isAgent: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.isAgent !== undefined, {
    message: "at least one of role or isAgent is required",
  });
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

/**
 * Profile edits for the signed-in user. Every field is optional: omitting one
 * leaves the stored value alone, while sending `null` clears it.
 *
 * `birthMonth` and `birthDay` are supplied together or not at all, and sending
 * both as null clears the birthday. The refinements below mirror the server's
 * rules so a user gets an immediate message rather than a round trip.
 */
export const profileUpdateInputSchema = z
  .object({
    displayName: z.string().trim().max(100).nullable().optional(),
    birthMonth: z.number().int().min(1).max(12).nullable().optional(),
    birthDay: z.number().int().min(1).max(31).nullable().optional(),
    pronouns: z.string().trim().max(50).nullable().optional(),
    jobTitle: z.string().trim().max(100).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (value) =>
      (value.birthMonth === undefined && value.birthDay === undefined) ||
      (value.birthMonth !== undefined && value.birthDay !== undefined),
    { message: "birthMonth and birthDay must be provided together", path: ["birthDay"] },
  );
export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>;

/** A sensible display label: the name, falling back to the email. */
export function userLabel(user: {
  displayName: string | null;
  email: string;
}): string {
  return user.displayName?.trim() || user.email;
}

/** A birthday rendered for display, or null when unset. */
export function formatBirthday(
  month: number | null,
  day: number | null,
): string | null {
  if (month == null || day == null) return null;
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const name = names[month - 1];
  return name ? `${name} ${day}` : null;
}

/**
 * `DELETE /auth/me` and `DELETE /users/{id}` both return the deleted user.
 * Deleting an account leaves its appointments in place.
 */
export const deleteSelfOutputSchema = userSchema;
export type DeleteSelfOutput = z.infer<typeof deleteSelfOutputSchema>;
