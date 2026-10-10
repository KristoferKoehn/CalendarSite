import { z } from "zod";
import { emailSchema, isoTimestampSchema, uuidSchema } from "./common";

export const passwordSchema = z.string().min(8);

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
