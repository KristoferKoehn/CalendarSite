import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentListQuery,
  AppointmentRescheduleInput,
  CreateResourceInput,
  LoginInput,
  LoginOutput,
  RegisterInput,
  RegisterOutput,
  Resource,
  UpdateResourceInput,
  UpdateUserInput,
  User,
} from "@/contract";
import type { ApiError } from "./errors";
import type { Result } from "./result";

export interface ApiClient {
  register(input: RegisterInput): Promise<Result<RegisterOutput, ApiError>>;
  login(input: LoginInput): Promise<Result<LoginOutput, ApiError>>;
  logout(): void;
  me(): Promise<Result<User, ApiError>>;

  listResources(): Promise<Result<Resource[], ApiError>>;
  createResource(input: CreateResourceInput): Promise<Result<Resource, ApiError>>;
  updateResource(id: string, input: UpdateResourceInput): Promise<Result<Resource, ApiError>>;
  deactivateResource(id: string): Promise<Result<Resource, ApiError>>;

  listUsers(): Promise<Result<User[], ApiError>>;
  updateUser(id: string, input: UpdateUserInput): Promise<Result<User, ApiError>>;

  createAppointment(input: AppointmentCreateInput): Promise<Result<Appointment, ApiError>>;
  listAppointments(query?: AppointmentListQuery): Promise<Result<Appointment[], ApiError>>;
  cancelAppointment(id: string): Promise<Result<Appointment, ApiError>>;
  rescheduleAppointment(
    id: string,
    input: AppointmentRescheduleInput,
  ): Promise<Result<Appointment, ApiError>>;
}
