import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { registerAppointmentPaths } from "./paths/appointments";
import { registerAuthPaths } from "./paths/auth";
import { registerResourcePaths } from "./paths/resources";
import { registerUserPaths } from "./paths/users";

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "opaque",
  });

  registerAuthPaths(registry);
  registerResourcePaths(registry);
  registerUserPaths(registry);
  registerAppointmentPaths(registry);

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "CalendarSite API",
      version: "0.1.0",
      description:
        "Appointment scheduling API contract. Times are entered as date and time in America/Los_Angeles and returned as UTC.",
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Backend (to be implemented)",
      },
    ],
  });
}
