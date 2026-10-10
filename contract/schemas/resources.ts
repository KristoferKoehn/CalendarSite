import { z } from "zod";
import { isoTimestampSchema, uuidSchema } from "./common";

export const resourceSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  timezone: z.string().min(1),
  active: z.boolean(),
  createdAt: isoTimestampSchema,
});
export type Resource = z.infer<typeof resourceSchema>;

export const resourceListOutputSchema = z.object({
  resources: z.array(resourceSchema),
});
export type ResourceListOutput = z.infer<typeof resourceListOutputSchema>;

export const createResourceInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  timezone: z.string().min(1).optional(),
});
export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

export const updateResourceInputSchema = createResourceInputSchema.partial();
export type UpdateResourceInput = z.infer<typeof updateResourceInputSchema>;
