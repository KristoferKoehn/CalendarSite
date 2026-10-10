import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { errorEnvelopeSchema } from "../errors";
import { uuidSchema } from "../schemas/common";
import {
  updateUserInputSchema,
  userListOutputSchema,
  userSchema,
} from "../schemas/users";

export function registerUserPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/users",
    summary: "List all users (admin)",
    tags: ["users"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Users",
        content: { "application/json": { schema: userListOutputSchema } },
      },
      401: {
        description: "Unauthenticated",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      403: {
        description: "Not an admin",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/users/{id}",
    summary: "Update a user role or agent flag (admin)",
    tags: ["users"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: uuidSchema }),
      body: {
        content: { "application/json": { schema: updateUserInputSchema } },
      },
    },
    responses: {
      200: {
        description: "Updated user",
        content: { "application/json": { schema: userSchema } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      401: {
        description: "Unauthenticated",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      403: {
        description: "Not an admin",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });
}
