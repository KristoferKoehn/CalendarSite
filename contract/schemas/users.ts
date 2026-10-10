import { z } from "zod";
import { emailSchema, isoTimestampSchema, uuidSchema } from "./common";

export const roleSchema = z.enum(["user", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
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
