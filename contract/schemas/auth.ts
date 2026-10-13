import { z } from "zod";
import { emailSchema, isoTimestampSchema, uuidSchema } from "./common";
// users.ts imports only from common, so there is no cycle.
import { userSchema } from "./users";

export const passwordSchema = z.string().min(8);

/**
 * Creating an account: an address and a password, and nothing else.
 *
 * Details are collected on the screen the confirmation link leads to, because the address
 * should be proven before the account is worth describing — and because a two-field sign-up
 * is one somebody finishes. Anything else sent here is ignored by the server, whose request
 * type no longer carries it.
 */
export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
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

/**
 * Redeeming a verification link signs you in.
 *
 * `token` is a session token, so the screen the link leads to can collect details without
 * asking for a password moments after the address was proven by other means. It is
 * optional because confirming the address is the part that matters: if the session could not
 * be issued, the address is still confirmed and the person can sign in normally.
 */
export const verifyEmailOutputSchema = z.object({
  user: userSchema,
  token: z.string().optional(),
});
export type VerifyEmailOutput = z.infer<typeof verifyEmailOutputSchema>;

/** Asking to resend answers 204 with no body. */
export const resendVerificationOutputSchema = z.object({ ok: z.literal(true) });
export type ResendVerificationOutput = z.infer<typeof resendVerificationOutputSchema>;
