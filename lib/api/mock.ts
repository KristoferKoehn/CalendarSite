import {
  ErrorCodes,
  appointmentCreateInputSchema,
  appointmentRescheduleInputSchema,
  createResourceInputSchema,
  loginInputSchema,
  registerInputSchema,
  updateResourceInputSchema,
  updateUserInputSchema,
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
  type Role,
  type UpdateResourceInput,
  type UpdateUserInput,
  type User,
} from "@/contract";
import { seattleWallTimeToLocalIso, seattleWallTimeToUtc } from "../time";
import type { ApiClient } from "./client";
import { ApiError } from "./errors";
import { err, ok, type Result } from "./result";
import type { TokenStore } from "./session";

type MockUser = User & { password: string };

type MockSession = {
  token: string;
  userId: string;
  expiresAt: Date;
};

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export class MockApiClient implements ApiClient {
  private readonly users = new Map<string, MockUser>();
  private readonly sessions = new Map<string, MockSession>();
  private readonly resources = new Map<string, Resource>();
  private readonly appointments = new Map<string, Appointment>();
  private readonly tokenStore: TokenStore;

  constructor(deps: { tokenStore: TokenStore; seed?: boolean }) {
    this.tokenStore = deps.tokenStore;
    if (deps.seed !== false) {
      this.seed();
    }
  }

  async register(input: RegisterInput): Promise<Result<RegisterOutput, ApiError>> {
    const parsed = registerInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(this.invalidInput(parsed.error.message));
    }

    const email = parsed.data.email;
    if ([...this.users.values()].some((user) => user.email === email)) {
      return err(new ApiError(ErrorCodes.CONFLICT, "Email already in use", { status: 409 }));
    }

    const user = this.addUser(email, parsed.data.password, "user");
    return ok({ userId: user.id });
  }

  async login(input: LoginInput): Promise<Result<LoginOutput, ApiError>> {
    const parsed = loginInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(this.invalidInput(parsed.error.message));
    }

    const user = [...this.users.values()].find(
      (candidate) => candidate.email === parsed.data.email,
    );
    if (!user || user.password !== parsed.data.password) {
      return err(new ApiError(ErrorCodes.UNAUTHENTICATED, "Invalid email or password", {
        status: 401,
      }));
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    this.sessions.set(token, { token, userId: user.id, expiresAt });
    this.tokenStore.set(token);

    return ok({ token, expiresAt: expiresAt.toISOString() });
  }

  logout(): void {
    this.tokenStore.clear();
  }

  async me(): Promise<Result<User, ApiError>> {
    const user = this.requireUser();
    if (!user.ok) return user;
    return ok(this.toPublicUser(user.value));
  }

  async listResources(): Promise<Result<Resource[], ApiError>> {
    const user = this.requireUser();
    if (!user.ok) return user;
    return ok([...this.resources.values()].filter((resource) => resource.active));
  }

  async createResource(input: CreateResourceInput): Promise<Result<Resource, ApiError>> {
    const admin = this.requireAdmin();
    if (!admin.ok) return admin;

    const parsed = createResourceInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(this.invalidInput(parsed.error.message));
    }

    const resource: Resource = {
      id: crypto.randomUUID(),
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      timezone: parsed.data.timezone ?? "America/Los_Angeles",
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.resources.set(resource.id, resource);
    return ok(resource);
  }

  async updateResource(
    id: string,
    input: UpdateResourceInput,
  ): Promise<Result<Resource, ApiError>> {
    const admin = this.requireAdmin();
    if (!admin.ok) return admin;

    const resource = this.resources.get(id);
    if (!resource) {
      return err(new ApiError(ErrorCodes.NOT_FOUND, "Resource not found", { status: 404 }));
    }

    const parsed = updateResourceInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(this.invalidInput(parsed.error.message));
    }

    const updated: Resource = {
      ...resource,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
    };
    this.resources.set(id, updated);
    return ok(updated);
  }

  async deactivateResource(id: string): Promise<Result<Resource, ApiError>> {
    const admin = this.requireAdmin();
    if (!admin.ok) return admin;

    const resource = this.resources.get(id);
    if (!resource) {
      return err(new ApiError(ErrorCodes.NOT_FOUND, "Resource not found", { status: 404 }));
    }

    const updated: Resource = { ...resource, active: false };
    this.resources.set(id, updated);
    return ok(updated);
  }

  async listUsers(): Promise<Result<User[], ApiError>> {
    const admin = this.requireAdmin();
    if (!admin.ok) return admin;
    return ok([...this.users.values()].map((user) => this.toPublicUser(user)));
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<Result<User, ApiError>> {
    const admin = this.requireAdmin();
    if (!admin.ok) return admin;

    const user = this.users.get(id);
    if (!user) {
      return err(new ApiError(ErrorCodes.NOT_FOUND, "User not found", { status: 404 }));
    }

    const parsed = updateUserInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(this.invalidInput(parsed.error.message));
    }

    const updated: MockUser = {
      ...user,
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.isAgent !== undefined ? { isAgent: parsed.data.isAgent } : {}),
    };
    this.users.set(id, updated);
    return ok(this.toPublicUser(updated));
  }

  async createAppointment(
    input: AppointmentCreateInput,
  ): Promise<Result<Appointment, ApiError>> {
    const user = this.requireUser();
    if (!user.ok) return user;

    const parsed = appointmentCreateInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(this.invalidInput(parsed.error.message));
    }

    const resource = this.resources.get(parsed.data.resourceId);
    if (!resource || !resource.active) {
      return err(new ApiError(ErrorCodes.NOT_FOUND, "Resource not found or inactive", {
        status: 404,
      }));
    }

    const { date, startTime, endTime } = parsed.data;
    const startUtc = seattleWallTimeToUtc(date, startTime);
    const endUtc = seattleWallTimeToUtc(date, endTime);

    if (endUtc.getTime() <= startUtc.getTime()) {
      return err(this.invalidInput("endTime must be after startTime"));
    }

    if (this.hasOverlap(resource.id, startUtc, endUtc)) {
      return err(new ApiError(ErrorCodes.CONFLICT, "Overlapping booking", { status: 409 }));
    }

    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      userId: user.value.id,
      resourceId: resource.id,
      startAt: startUtc.toISOString(),
      endAt: endUtc.toISOString(),
      startAtLocal: seattleWallTimeToLocalIso(date, startTime, startUtc),
      endAtLocal: seattleWallTimeToLocalIso(date, endTime, endUtc),
      status: "booked",
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    };
    this.appointments.set(appointment.id, appointment);
    return ok(appointment);
  }

  async listAppointments(
    query: AppointmentListQuery = {},
  ): Promise<Result<Appointment[], ApiError>> {
    const user = this.requireUser();
    if (!user.ok) return user;

    const isAdmin = user.value.role === "admin";
    let list = [...this.appointments.values()];

    if (!isAdmin) {
      list = list.filter((appointment) => appointment.userId === user.value.id);
    }

    if (query.resourceId) {
      list = list.filter((appointment) => appointment.resourceId === query.resourceId);
    }
    if (query.userId && isAdmin) {
      list = list.filter((appointment) => appointment.userId === query.userId);
    }
    if (query.status) {
      list = list.filter((appointment) => appointment.status === query.status);
    }
    if (query.from) {
      const from = query.from;
      list = list.filter(
        (appointment) => appointment.startAtLocal.slice(0, 10) >= from,
      );
    }
    if (query.to) {
      const to = query.to;
      list = list.filter(
        (appointment) => appointment.startAtLocal.slice(0, 10) <= to,
      );
    }

    return ok(list);
  }

  async cancelAppointment(id: string): Promise<Result<Appointment, ApiError>> {
    const user = this.requireUser();
    if (!user.ok) return user;

    const appointment = this.appointments.get(id);
    if (!appointment) {
      return err(new ApiError(ErrorCodes.NOT_FOUND, "Appointment not found", { status: 404 }));
    }

    if (!this.canModifyAppointment(user.value, appointment)) {
      return err(new ApiError(ErrorCodes.FORBIDDEN, "Not the owner or an admin", { status: 403 }));
    }
    if (appointment.status === "cancelled") {
      return err(new ApiError(ErrorCodes.CONFLICT, "Already cancelled", { status: 409 }));
    }

    const now = new Date().toISOString();
    const updated: Appointment = {
      ...appointment,
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    };
    this.appointments.set(id, updated);
    return ok(updated);
  }

  async rescheduleAppointment(
    id: string,
    input: AppointmentRescheduleInput,
  ): Promise<Result<Appointment, ApiError>> {
    const user = this.requireUser();
    if (!user.ok) return user;

    const appointment = this.appointments.get(id);
    if (!appointment) {
      return err(new ApiError(ErrorCodes.NOT_FOUND, "Appointment not found", { status: 404 }));
    }

    if (!this.canModifyAppointment(user.value, appointment)) {
      return err(new ApiError(ErrorCodes.FORBIDDEN, "Not the owner or an admin", { status: 403 }));
    }
    if (appointment.status === "cancelled") {
      return err(new ApiError(ErrorCodes.CONFLICT, "Already cancelled", { status: 409 }));
    }

    const parsed = appointmentRescheduleInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(this.invalidInput(parsed.error.message));
    }

    const { date, startTime, endTime } = parsed.data;
    const startUtc = seattleWallTimeToUtc(date, startTime);
    const endUtc = seattleWallTimeToUtc(date, endTime);

    if (endUtc.getTime() <= startUtc.getTime()) {
      return err(this.invalidInput("endTime must be after startTime"));
    }

    if (this.hasOverlap(appointment.resourceId, startUtc, endUtc, id)) {
      return err(new ApiError(ErrorCodes.CONFLICT, "Overlapping booking", { status: 409 }));
    }

    const updated: Appointment = {
      ...appointment,
      startAt: startUtc.toISOString(),
      endAt: endUtc.toISOString(),
      startAtLocal: seattleWallTimeToLocalIso(date, startTime, startUtc),
      endAtLocal: seattleWallTimeToLocalIso(date, endTime, endUtc),
      updatedAt: new Date().toISOString(),
    };
    this.appointments.set(id, updated);
    return ok(updated);
  }

  private requireUser(): Result<MockUser, ApiError> {
    const token = this.tokenStore.get();
    if (!token) {
      return err(new ApiError(ErrorCodes.UNAUTHENTICATED, "Missing token", { status: 401 }));
    }

    const session = this.sessions.get(token);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return err(new ApiError(ErrorCodes.UNAUTHENTICATED, "Expired or invalid token", {
        status: 401,
      }));
    }

    const user = this.users.get(session.userId);
    if (!user) {
      return err(new ApiError(ErrorCodes.UNAUTHENTICATED, "User not found", { status: 401 }));
    }

    return ok(user);
  }

  private requireAdmin(): Result<MockUser, ApiError> {
    const user = this.requireUser();
    if (!user.ok) return user;
    if (user.value.role !== "admin") {
      return err(new ApiError(ErrorCodes.FORBIDDEN, "Admin access required", { status: 403 }));
    }
    return user;
  }

  private canModifyAppointment(user: MockUser, appointment: Appointment): boolean {
    return user.role === "admin" || appointment.userId === user.id;
  }

  private hasOverlap(
    resourceId: string,
    startUtc: Date,
    endUtc: Date,
    excludeId?: string,
  ): boolean {
    return [...this.appointments.values()].some(
      (appointment) =>
        appointment.id !== excludeId &&
        appointment.resourceId === resourceId &&
        appointment.status === "booked" &&
        appointment.startAt < endUtc.toISOString() &&
        appointment.endAt > startUtc.toISOString(),
    );
  }

  private invalidInput(message: string): ApiError {
    return new ApiError(ErrorCodes.INVALID_INPUT, message, { status: 400 });
  }

  private toPublicUser(user: MockUser): User {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isAgent: user.isAgent,
      createdAt: user.createdAt,
    };
  }

  private addUser(email: string, password: string, role: Role): MockUser {
    const user: MockUser = {
      id: crypto.randomUUID(),
      email,
      password,
      role,
      isAgent: false,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  private addResource(name: string, description: string): void {
    const resource: Resource = {
      id: crypto.randomUUID(),
      name,
      description,
      timezone: "America/Los_Angeles",
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.resources.set(resource.id, resource);
  }

  private seed(): void {
    this.addUser("admin@example.com", "password123", "admin");
    this.addUser("user@example.com", "password123", "user");
    this.addResource("Room A", "Main conference room");
    this.addResource("Room B", "Small meeting room");
  }
}
