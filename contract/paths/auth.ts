import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { errorEnvelopeSchema } from "../errors";
import {
  loginInputSchema,
  loginOutputSchema,
  registerInputSchema,
  registerOutputSchema,
} from "../schemas/auth";
import { userSchema } from "../schemas/users";

export function registerAuthPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "post",
    path: "/auth/register",
    summary: "Register a new user",
    tags: ["auth"],
    request: {
      body: {
        content: { "application/json": { schema: registerInputSchema } },
      },
    },
    responses: {
      201: {
        description: "User created",
        content: { "application/json": { schema: registerOutputSchema } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      409: {
        description: "Email already in use",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/auth/login",
    summary: "Log in and receive a bearer token",
    tags: ["auth"],
    request: {
      body: {
        content: { "application/json": { schema: loginInputSchema } },
      },
    },
    responses: {
      200: {
        description: "Authenticated",
        content: { "application/json": { schema: loginOutputSchema } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      401: {
        description: "Invalid credentials",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/auth/me",
    summary: "Return the authenticated user",
    tags: ["auth"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Current user",
        content: { "application/json": { schema: userSchema } },
      },
      401: {
        description: "Missing or expired token",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });
}
