import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { errorEnvelopeSchema } from "../errors";
import { uuidSchema } from "../schemas/common";
import {
  createResourceInputSchema,
  resourceListOutputSchema,
  resourceSchema,
  updateResourceInputSchema,
} from "../schemas/resources";

export function registerResourcePaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/resources",
    summary: "List active resources",
    tags: ["resources"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Resources",
        content: { "application/json": { schema: resourceListOutputSchema } },
      },
      401: {
        description: "Unauthenticated",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/resources",
    summary: "Create a resource (admin)",
    tags: ["resources"],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: createResourceInputSchema } },
      },
    },
    responses: {
      201: {
        description: "Created resource",
        content: { "application/json": { schema: resourceSchema } },
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
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/resources/{id}",
    summary: "Update a resource (admin)",
    tags: ["resources"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: uuidSchema }),
      body: {
        content: { "application/json": { schema: updateResourceInputSchema } },
      },
    },
    responses: {
      200: {
        description: "Updated resource",
        content: { "application/json": { schema: resourceSchema } },
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
        description: "Resource not found",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/resources/{id}",
    summary: "Deactivate a resource (admin)",
    tags: ["resources"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: uuidSchema }),
    },
    responses: {
      200: {
        description: "Deactivated resource",
        content: { "application/json": { schema: resourceSchema } },
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
        description: "Resource not found",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });
}
