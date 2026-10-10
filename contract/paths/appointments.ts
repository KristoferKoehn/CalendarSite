import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { errorEnvelopeSchema } from "../errors";
import { uuidSchema } from "../schemas/common";
import {
  appointmentCreateInputSchema,
  appointmentListOutputSchema,
  appointmentListQuerySchema,
  appointmentRescheduleInputSchema,
  appointmentSchema,
} from "../schemas/appointments";

export function registerAppointmentPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "post",
    path: "/appointments",
    summary: "Create an appointment",
    tags: ["appointments"],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: appointmentCreateInputSchema } },
      },
    },
    responses: {
      201: {
        description: "Created appointment",
        content: { "application/json": { schema: appointmentSchema } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      401: {
        description: "Unauthenticated",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      404: {
        description: "Resource not found or inactive",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      409: {
        description: "Overlapping booking",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/appointments",
    summary: "List appointments (own for users, all for admins)",
    tags: ["appointments"],
    security: [{ bearerAuth: [] }],
    request: {
      query: appointmentListQuerySchema,
    },
    responses: {
      200: {
        description: "Appointments",
        content: { "application/json": { schema: appointmentListOutputSchema } },
      },
      400: {
        description: "Invalid input",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      401: {
        description: "Unauthenticated",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/appointments/{id}/cancel",
    summary: "Cancel an appointment (owner or admin)",
    tags: ["appointments"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: uuidSchema }),
    },
    responses: {
      200: {
        description: "Cancelled appointment",
        content: { "application/json": { schema: appointmentSchema } },
      },
      401: {
        description: "Unauthenticated",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      403: {
        description: "Not the owner or an admin",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      404: {
        description: "Appointment not found",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      409: {
        description: "Already cancelled",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/appointments/{id}/reschedule",
    summary: "Reschedule an appointment (owner or admin)",
    tags: ["appointments"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: uuidSchema }),
      body: {
        content: {
          "application/json": { schema: appointmentRescheduleInputSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Rescheduled appointment",
        content: { "application/json": { schema: appointmentSchema } },
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
        description: "Not the owner or an admin",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      404: {
        description: "Appointment not found",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
      409: {
        description: "Overlapping booking or already cancelled",
        content: { "application/json": { schema: errorEnvelopeSchema } },
      },
    },
  });
}
