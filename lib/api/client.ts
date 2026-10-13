import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentDeleteOutput,
  AppointmentListQuery,
  AppointmentRescheduleInput,
  CreateResourceInput,
  DeleteSelfOutput,
  LoginInput,
  LoginOutput,
  ProfileUpdateInput,
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
  /** Update the caller's own profile. Omitted fields are left alone. */
  updateProfile(input: ProfileUpdateInput): Promise<Result<User, ApiError>>;
  /** Delete the caller's own account. Their appointments are left in place. */
  deleteAccount(): Promise<Result<DeleteSelfOutput, ApiError>>;

  listResources(): Promise<Result<Resource[], ApiError>>;
  createResource(input: CreateResourceInput): Promise<Result<Resource, ApiError>>;
  updateResource(id: string, input: UpdateResourceInput): Promise<Result<Resource, ApiError>>;
  deactivateResource(id: string): Promise<Result<Resource, ApiError>>;

  /** The people directory. Readable by every authenticated user. */
  listUsers(): Promise<Result<User[], ApiError>>;
  /** One user's profile. Readable by every authenticated user. */
  getUser(id: string): Promise<Result<User, ApiError>>;
  updateUser(id: string, input: UpdateUserInput): Promise<Result<User, ApiError>>;
  deleteUser(id: string): Promise<Result<User, ApiError>>;

  createAppointment(input: AppointmentCreateInput): Promise<Result<Appointment, ApiError>>;
  listAppointments(query?: AppointmentListQuery): Promise<Result<Appointment[], ApiError>>;
  cancelAppointment(id: string): Promise<Result<Appointment, ApiError>>;
  rescheduleAppointment(
    id: string,
    input: AppointmentRescheduleInput,
  ): Promise<Result<Appointment, ApiError>>;
  /** Permanently delete an appointment. Admin-only. */
  deleteAppointment(id: string): Promise<Result<AppointmentDeleteOutput, ApiError>>;
}
