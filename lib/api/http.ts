import {
  ErrorCodes,
  appointmentListOutputSchema,
  appointmentSchema,
  errorEnvelopeSchema,
  loginOutputSchema,
  registerOutputSchema,
  resourceListOutputSchema,
  resourceSchema,
  userListOutputSchema,
  userSchema,
  type Appointment,
  type AppointmentCreateInput,
  type AppointmentListQuery,
  type AppointmentRescheduleInput,
  type CreateResourceInput,
  type LoginInput,
  type LoginOutput,
  type RegisterInput,
  type RegisterOutput,
  type Resource,
  type UpdateResourceInput,
  type UpdateUserInput,
  type User,
} from "@/contract";
import type { ZodType } from "zod";
import type { ApiClient } from "./client";
import { ApiError } from "./errors";
import { err, ok, type Result } from "./result";
import type { TokenStore } from "./session";

type RequestOptions<T> = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  auth?: boolean;
  schema: ZodType<T>;
};

export class HttpApiClient implements ApiClient {
  constructor(
    private readonly deps: {
      baseUrl: string;
      tokenStore: TokenStore;
      fetchFn?: typeof fetch;
    },
  ) {}

  async register(input: RegisterInput): Promise<Result<RegisterOutput, ApiError>> {
    return this.request({
      method: "POST",
      path: "/auth/register",
      body: input,
      schema: registerOutputSchema,
    });
  }

  async login(input: LoginInput): Promise<Result<LoginOutput, ApiError>> {
    const result = await this.request({
      method: "POST",
      path: "/auth/login",
      body: input,
      schema: loginOutputSchema,
    });
    if (result.ok) {
      this.deps.tokenStore.set(result.value.token);
    }
    return result;
  }

  logout(): void {
    this.deps.tokenStore.clear();
  }

  async me(): Promise<Result<User, ApiError>> {
    return this.request({
      method: "GET",
      path: "/auth/me",
      auth: true,
      schema: userSchema,
    });
  }

  async listResources(): Promise<Result<Resource[], ApiError>> {
    const result = await this.request({
      method: "GET",
      path: "/resources",
      auth: true,
      schema: resourceListOutputSchema,
    });
    return result.ok ? ok(result.value.resources) : result;
  }

  async createResource(input: CreateResourceInput): Promise<Result<Resource, ApiError>> {
    return this.request({
      method: "POST",
      path: "/resources",
      body: input,
      auth: true,
      schema: resourceSchema,
    });
  }

  async updateResource(
    id: string,
    input: UpdateResourceInput,
  ): Promise<Result<Resource, ApiError>> {
    return this.request({
      method: "PATCH",
      path: `/resources/${encodeURIComponent(id)}`,
      body: input,
      auth: true,
      schema: resourceSchema,
    });
  }

  async deactivateResource(id: string): Promise<Result<Resource, ApiError>> {
    return this.request({
      method: "DELETE",
      path: `/resources/${encodeURIComponent(id)}`,
      auth: true,
      schema: resourceSchema,
    });
  }

  async listUsers(): Promise<Result<User[], ApiError>> {
    const result = await this.request({
      method: "GET",
      path: "/users",
      auth: true,
      schema: userListOutputSchema,
    });
    return result.ok ? ok(result.value.users) : result;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<Result<User, ApiError>> {
    return this.request({
      method: "PATCH",
      path: `/users/${encodeURIComponent(id)}`,
      body: input,
      auth: true,
      schema: userSchema,
    });
  }

  async createAppointment(
    input: AppointmentCreateInput,
  ): Promise<Result<Appointment, ApiError>> {
    return this.request({
      method: "POST",
      path: "/appointments",
      body: input,
      auth: true,
      schema: appointmentSchema,
    });
  }

  async listAppointments(
    query: AppointmentListQuery = {},
  ): Promise<Result<Appointment[], ApiError>> {
    const result = await this.request({
      method: "GET",
      path: "/appointments",
      query: {
        resourceId: query.resourceId,
        userId: query.userId,
        from: query.from,
        to: query.to,
        status: query.status,
      },
      auth: true,
      schema: appointmentListOutputSchema,
    });
    return result.ok ? ok(result.value.appointments) : result;
  }

  async cancelAppointment(id: string): Promise<Result<Appointment, ApiError>> {
    return this.request({
      method: "POST",
      path: `/appointments/${encodeURIComponent(id)}/cancel`,
      auth: true,
      schema: appointmentSchema,
    });
  }

  async rescheduleAppointment(
    id: string,
    input: AppointmentRescheduleInput,
  ): Promise<Result<Appointment, ApiError>> {
    return this.request({
      method: "POST",
      path: `/appointments/${encodeURIComponent(id)}/reschedule`,
      body: input,
      auth: true,
      schema: appointmentSchema,
    });
  }

  private async request<T>(options: RequestOptions<T>): Promise<Result<T, ApiError>> {
    const url = new URL(options.path, this.deps.baseUrl);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers = new Headers();
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (options.auth) {
      const token = this.deps.tokenStore.get();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    let response: Response;
    try {
      response = await (this.deps.fetchFn ?? fetch)(url.toString(), {
        method: options.method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      return err(new ApiError(ErrorCodes.INTERNAL, "Network error", { status: 0 }));
    }

    if (!response.ok) {
      return err(await HttpApiClient.toApiError(response));
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return err(
        new ApiError(ErrorCodes.INTERNAL, "Response was not valid JSON", {
          status: response.status,
        }),
      );
    }

    const parsed = options.schema.safeParse(payload);
    if (!parsed.success) {
      return err(
        new ApiError(ErrorCodes.INTERNAL, "Unexpected response shape", {
          status: response.status,
        }),
      );
    }

    return ok(parsed.data);
  }

  private static async toApiError(response: Response): Promise<ApiError> {
    try {
      const payload: unknown = await response.json();
      const parsed = errorEnvelopeSchema.safeParse(payload);
      if (parsed.success) {
        return new ApiError(parsed.data.error.code, parsed.data.error.message, {
          status: response.status,
          details: parsed.data.error.details,
        });
      }
    } catch {
      // Fall through to a generic error.
    }
    return new ApiError(
      ErrorCodes.INTERNAL,
      `Request failed with status ${response.status}`,
      { status: response.status },
    );
  }
}
