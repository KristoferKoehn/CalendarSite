import {
  ErrorCodes,
  appointmentDeleteOutputSchema,
  appointmentListOutputSchema,
  appointmentSchema,
  downloadListSchema,
  downloadResponseSchema,
  errorEnvelopeSchema,
  fileListSchema,
  fileResponseSchema,
  loginOutputSchema,
  projectListSchema,
  projectResponseSchema,
  registerOutputSchema,
  resetPasswordOutputSchema,
  resourceListOutputSchema,
  resendVerificationOutputSchema,
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
  type ResendVerificationOutput,
  type ResetPasswordInput,
  type ResetPasswordOutput,
  type VerifyEmailInput,
  type VerifyEmailOutput,
  type Download,
  type Project,
  type StoredFile,
  type ProjectCreateInput,
  type ProjectUpdateInput,
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
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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
  /**
   * Overrides the default deadline for this request.
   *
   * The default is sized for JSON round trips. An upload is not one: a game build is tens of
   * megabytes, and the time it takes is a property of the connection rather than of the server. Left
   * at the default, a large upload would be abandoned mid-flight and reported as a timeout, which
   * looks like a server fault and is not one.
   */
  timeoutMs?: number;
};

/**
 * Joins the configured base to a request path by hand, rather than with `new URL(path, base)`.
 *
 * `new URL` resolves the second argument *against* the first, so an absolute path replaces the
 * base's path entirely: with a base of `https://host/api`, `new URL("/auth/login", base)` is
 * `https://host/auth/login` — the prefix silently disappears. That ruled out serving the API
 * behind a path on the same host as the site, which is the one arrangement that removes CORS
 * completely, because a same-origin request never asks permission.
 *
 * Concatenating instead keeps whatever path the base carries, so `https://host/api` and
 * `https://host` both work and the deployment can choose.
 */
function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/**
 * How long a request may take before it is abandoned.
 *
 * A network that silently drops packets leaves a request hanging rather than failing, so without
 * a deadline the app sits on a spinner indefinitely. Fifteen seconds is well beyond a slow
 * connection and well short of a person giving up.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * A short, readable reason a request never completed.
 *
 * `fetch` rejects with a `TypeError` whose `cause` carries the real story — the browser codes come
 * from there. The fallbacks matter because the shape differs: some browsers set `code`, some only
 * a message, and a timeout arrives as an AbortSignal error with no cause at all.
 */
function describeNetworkFailure(cause: unknown): string {
  if (!(cause instanceof Error)) return "unknown";
  if (cause.name === "TimeoutError") return "no response";
  const inner = (cause as { cause?: unknown }).cause;
  if (inner && typeof inner === "object") {
    const { code, message } = inner as { code?: unknown; message?: unknown };
    if (typeof code === "string" && code) return code;
    if (typeof message === "string" && message) return message;
  }
  return cause.message || cause.name || "unknown";
}

export class HttpApiClient implements ApiClient {
  constructor(
    private readonly deps: {
      baseUrl: string;
      tokenStore: TokenStore;
      fetchFn?: typeof fetch;
      /** Overridable so a test does not have to wait fifteen seconds to exercise a timeout. */
      timeoutMs?: number;
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
   * Store a session token obtained elsewhere.
   *
   * Used by the verification link, which proves the address and hands back a session in the
   * same response. There is no other way in: every other path that ends in a session goes
   * through login, which already stores its own.
   */
  adoptToken(token: string): void {
    this.deps.tokenStore.set(token);
  }

  /**
   * Redeem a verification link. Needs no session — the link is opened from a mail client —
   * and the response carries one, so the screen behind it is already signed in.
   */
  async verifyEmail(input: VerifyEmailInput): Promise<Result<VerifyEmailOutput, ApiError>> {
    return this.request({
      method: "POST",
      path: "/auth/verify-email",
      body: input,
      schema: verifyEmailOutputSchema,
    });
  }

  /**
   * Ask for a fresh verification link. Answers 204 whether or not the address has an
   * account, so it cannot be used to discover who has signed up.
   */
  async resendVerification(
    input: ResendVerificationInput,
  ): Promise<Result<ResendVerificationOutput, ApiError>> {
    return this.request({
      method: "POST",
      path: "/auth/resend-verification",
      body: input,
      schema: resendVerificationOutputSchema,
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

  // The portfolio. Reading is public, so a signed-out visitor could fetch it too, though the
  // landing page reads the files directly rather than going through the API.
  async listProjects(): Promise<Result<Project[], ApiError>> {
    const result = await this.request({
      method: "GET",
      path: "/projects",
      schema: projectListSchema,
    });
    return result.ok ? ok(result.value.projects) : result;
  }

  /**
   * Create a project, optionally with a game build attached.
   *
   * Multipart rather than JSON because the build is a zip: base64 inside JSON would inflate it by a
   * third and make the whole thing one string the server has to hold in memory.
   */
  async createProject(input: ProjectCreateInput): Promise<Result<Project, ApiError>> {
    const form = new FormData();
    form.set("name", input.name);
    if (input.slug) form.set("slug", input.slug);
    form.set("description", input.description);
    form.set("status", input.status);
    form.set("stack", input.stack.join(", "));
    form.set("when", input.when);
    // Always sent, including "play": the backend's default only covers a client that omits it.
    form.set("delivery", input.delivery);
    if (input.href) form.set("href", input.href);
    // Left off entirely when there is no file, so the backend sees "no upload" rather than an empty
    // one — an empty file input still submits a nameless part in some browsers.
    if (input.game) form.set("game", input.game);

    const result = await this.request({
      method: "POST",
      path: "/projects",
      auth: true,
      body: form,
      schema: projectResponseSchema,
      // Ten minutes. A build is tens of megabytes, and the time it takes belongs to the connection
      // rather than the server — abandoning it halfway would report a timeout for something that is
      // working.
      timeoutMs: 10 * 60_000,
    });
    return result.ok ? ok(result.value.project) : result;
  }

  async updateProject(slug: string, input: ProjectUpdateInput): Promise<Result<Project, ApiError>> {
    const result = await this.request({
      method: "PUT",
      path: `/projects/${encodeURIComponent(slug)}`,
      auth: true,
      body: input,
      schema: projectResponseSchema,
    });
    return result.ok ? ok(result.value.project) : result;
  }

  async deleteProject(slug: string): Promise<Result<Project, ApiError>> {
    const result = await this.request({
      method: "DELETE",
      path: `/projects/${encodeURIComponent(slug)}`,
      auth: true,
      schema: projectResponseSchema,
    });
    return result.ok ? ok(result.value.project) : result;
  }

  // The file shelf.
  async listFiles(): Promise<Result<StoredFile[], ApiError>> {
    const result = await this.request({
      method: "GET",
      path: "/files",
      auth: true,
      schema: fileListSchema,
    });
    return result.ok ? ok(result.value.files) : result;
  }

  async uploadFile(file: File, name?: string): Promise<Result<StoredFile, ApiError>> {
    const form = new FormData();
    form.set("file", file);
    // Left off when absent: the backend falls back to the name the browser sent.
    if (name) form.set("name", name);

    const result = await this.request({
      method: "POST",
      path: "/files",
      auth: true,
      body: form,
      schema: fileResponseSchema,
      // The same reasoning as the game upload: a big file takes as long as the connection takes, and
      // fifteen seconds would report a timeout for something that is working.
      timeoutMs: 10 * 60_000,
    });
    return result.ok ? ok(result.value.file) : result;
  }

  async deleteFile(name: string): Promise<Result<StoredFile, ApiError>> {
    const result = await this.request({
      method: "DELETE",
      path: `/files/${encodeURIComponent(name)}`,
      auth: true,
      schema: fileResponseSchema,
    });
    return result.ok ? ok(result.value.file) : result;
  }

  // The downloads inventory.
  async listDownloads(): Promise<Result<Download[], ApiError>> {
    const result = await this.request({
      method: "GET",
      path: "/downloads",
      auth: true,
      schema: downloadListSchema,
    });
    return result.ok ? ok(result.value.downloads) : result;
  }

  async deleteDownload(slug: string): Promise<Result<Download, ApiError>> {
    const result = await this.request({
      method: "DELETE",
      path: `/downloads/${encodeURIComponent(slug)}`,
      auth: true,
      schema: downloadResponseSchema,
    });
    return result.ok ? ok(result.value.download) : result;
  }

  private async request<T>(options: RequestOptions<T>): Promise<Result<T, ApiError>> {
    if (!this.deps.baseUrl) {
      return err(
        new ApiError(ErrorCodes.INTERNAL, "NEXT_PUBLIC_API_URL is not configured", {
          status: 0,
        }),
      );
    }

    const url = new URL(joinUrl(this.deps.baseUrl, options.path));

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers = new Headers();
    // A FormData body must NOT get a Content-Type: the browser sets it, and it carries the multipart
    // boundary. Setting it by hand produces a request the server cannot parse.
    const isForm = options.body instanceof FormData;
    if (options.body !== undefined && !isForm) {
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
        body:
          options.body === undefined
            ? undefined
            : isForm
              ? (options.body as FormData)
              : JSON.stringify(options.body),
        // A network that silently drops packets leaves a request hanging rather than failing, so
        // without this the app would sit on a spinner forever. Fifteen seconds is well beyond a
        // slow connection and well short of a person giving up.
        signal: AbortSignal.timeout(options.timeoutMs ?? this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (cause) {
      // The message names the cause rather than saying "Network error". A browser reports
      // ERR_CONNECTION_REFUSED, ERR_TIMED_OUT or ERR_CERT_AUTHORITY_INVALID in the error's cause,
      // and that difference is the whole diagnosis: refused means something answered and said no,
      // timed out means nothing answered at all. Reporting one string for all of them makes a
      // blocked port indistinguishable from a wrong certificate.
      const timedOut = cause instanceof Error && cause.name === "TimeoutError";
      const code = describeNetworkFailure(cause);
      const seconds = (options.timeoutMs ?? this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000;
      return err(
        new ApiError(
          ErrorCodes.INTERNAL,
          timedOut
            ? `The server did not answer within ${seconds}s (${code})`
            : `Could not reach the server (${code})`,
          { status: 0 },
        ),
      );
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
