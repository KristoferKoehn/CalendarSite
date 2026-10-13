import {
  ErrorCodes,
  appointmentDeleteOutputSchema,
  appointmentListOutputSchema,
  appointmentSchema,
  errorEnvelopeSchema,
  loginOutputSchema,
  registerOutputSchema,
  resetPasswordOutputSchema,
  resourceListOutputSchema,
  verifyEmailOutputSchema,
  resourceSchema,
  userListOutputSchema,
  userSchema,
  type Appointment,
  type AppointmentCreateInput,
  type AppointmentDeleteOutput,
  type AppointmentListQuery,
  type AppointmentRescheduleInput,
  type CreateResourceInput,
  type ForgotPasswordInput,
  type LoginInput,
  type LoginOutput,
  type ProfileUpdateInput,
  type RegisterInput,
  type RegisterOutput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type ResetPasswordOutput,
  type VerifyEmailInput,
  type VerifyEmailOutput,
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
  /**
   * The endpoint answers 204 with no body, so there is nothing to parse. Without
   * this the client would try to decode an empty body as JSON and report a bogus
   * "Response was not valid JSON" for a request that actually succeeded.
   */
  noContent?: boolean;
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

  /**
   * Ask for a reset link. Resolves the same way whether or not the address has an
   * account — the server answers 204 either way, on purpose, so that this cannot be
   * used to discover who has signed up.
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<Result<ResetPasswordOutput, ApiError>> {
    return this.request({
      method: "POST",
      path: "/auth/forgot-password",
      body: input,
      schema: resetPasswordOutputSchema,
      noContent: true,
    });
  }

  /**
   * Redeem a reset link. On success every existing session for the account is
   * invalidated server-side, so any token held elsewhere stops working.
   */
  async resetPassword(input: ResetPasswordInput): Promise<Result<ResetPasswordOutput, ApiError>> {
    return this.request({
      method: "POST",
      path: "/auth/reset-password",
      body: input,
      schema: resetPasswordOutputSchema,
      noContent: true,
    });
  }

  logout(): void {
    this.deps.tokenStore.clear();
  }

  /**
   * Redeem a verification link. Answers 204 with no body, and needs no session: the link
   * is opened from a mail client.
   */
  async verifyEmail(input: VerifyEmailInput): Promise<Result<VerifyEmailOutput, ApiError>> {
    return this.request({
      method: "POST",
      path: "/auth/verify-email",
      body: input,
      schema: verifyEmailOutputSchema,
      noContent: true,
    });
  }

  /**
   * Ask for a fresh verification link. Answers 204 whether or not the address has an
   * account, so it cannot be used to discover who has signed up.
   */
  async resendVerification(
    input: ResendVerificationInput,
  ): Promise<Result<VerifyEmailOutput, ApiError>> {
    return this.request({
      method: "POST",
      path: "/auth/resend-verification",
      body: input,
      schema: verifyEmailOutputSchema,
      noContent: true,
    });
  }

  async me(): Promise<Result<User, ApiError>> {
    return this.request({
      method: "GET",
      path: "/auth/me",
      auth: true,
      schema: userSchema,
    });
  }

  async updateProfile(input: ProfileUpdateInput): Promise<Result<User, ApiError>> {
    return this.request({
      method: "PATCH",
      path: "/auth/me",
      body: input,
      auth: true,
      schema: userSchema,
    });
  }

  async deleteAccount(): Promise<Result<User, ApiError>> {
    const result = await this.request({
      method: "DELETE",
      path: "/auth/me",
      auth: true,
      schema: userSchema,
    });
    // The token is worthless once the account is gone.
    if (result.ok) this.deps.tokenStore.clear();
    return result;
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

  async getUser(id: string): Promise<Result<User, ApiError>> {
    return this.request({
      method: "GET",
      path: `/users/${encodeURIComponent(id)}`,
      auth: true,
      schema: userSchema,
    });
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

  async deleteUser(id: string): Promise<Result<User, ApiError>> {
    return this.request({
      method: "DELETE",
      path: `/users/${encodeURIComponent(id)}`,
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
    // Appointments are readable by every authenticated user; `userId` narrows to
    // one owner and is not restricted to admins.
    const result = await this.request({
      method: "GET",
      path: "/appointments",
      query: {
        resourceId: query.resourceId,
        userId: query.userId,
        title: query.title,
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

  async deleteAppointment(id: string): Promise<Result<AppointmentDeleteOutput, ApiError>> {
    return this.request({
      method: "DELETE",
      path: `/appointments/${encodeURIComponent(id)}`,
      auth: true,
      schema: appointmentDeleteOutputSchema,
    });
  }

  private async request<T>(options: RequestOptions<T>): Promise<Result<T, ApiError>> {
    if (!this.deps.baseUrl) {
      return err(
        new ApiError(ErrorCodes.INTERNAL, "NEXT_PUBLIC_API_URL is not configured", {
          status: 0,
        }),
      );
    }

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

    if (options.noContent) {
      // The contract for these routes is "204, no body". Anything else would be a
      // server-side change worth noticing, but it is not this client's job to police
      // it, so the call simply succeeds.
      const parsed = options.schema.safeParse({ ok: true });
      if (!parsed.success) {
        return err(
          new ApiError(ErrorCodes.INTERNAL, "Unexpected response shape", {
            status: response.status,
          }),
        );
      }
      return ok(parsed.data);
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
