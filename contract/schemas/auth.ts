import { z } from "zod";
import { emailSchema, isoTimestampSchema, uuidSchema } from "./common";

export const passwordSchema = z.string().min(8);

/**
 * Creating an account, with the profile fields from `PATCH /auth/me` alongside it.
 *
 * The profile is optional here, so signing up stays a short form for anyone who wants that
 * and a complete one for anyone who does not want to revisit Settings. Everything except the
 * credentials is nullable because "left blank" is a real answer for all of it.
 *
 * The birthday is month and day only, and must arrive as a pair or not at all — sending one
 * without the other is a mistake worth refusing rather than dropping quietly.
 */
export const registerInputSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
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
    { message: "Give both a month and a day, or neither", path: ["birthDay"] },
  );
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerOutputSchema = z.object({
  userId: uuidSchema,
});
export type RegisterOutput = z.infer<typeof registerOutputSchema>;

export const loginOutputSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoTimestampSchema,
});
export type LoginOutput = z.infer<typeof loginOutputSchema>;

/**
 * Starting a reset. The server answers identically whether or not the address has
 * an account, so there is no "found / not found" result to model here.
 */
export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

/**
 * Redeeming a reset link. The token comes from the URL, so it is only checked for
 * presence here; the server decides whether it is still valid.
 */
export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, "This reset link is missing its token."),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

/**
 * Confirms a reset completed. Deliberately carries no user or token: the server
 * returns 204 with no body.
 */
export const resetPasswordOutputSchema = z.object({ ok: z.literal(true) });
export type ResetPasswordOutput = z.infer<typeof resetPasswordOutputSchema>;

/** Redeeming a verification link. No session is needed: the link comes from a mail client. */
export const verifyEmailInputSchema = z.object({
  token: z.string().min(1, "This verification link is missing its token."),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

/** Asking for a fresh verification link. */
export const resendVerificationInputSchema = z.object({
  email: emailSchema,
});
export type ResendVerificationInput = z.infer<typeof resendVerificationInputSchema>;

/** Redeeming a verification link answers 204 with no body. */
export const verifyEmailOutputSchema = z.object({ ok: z.literal(true) });
export type VerifyEmailOutput = z.infer<typeof verifyEmailOutputSchema>;
