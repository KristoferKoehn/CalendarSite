import { z } from "zod";
import {
  dateSchema,
  isoTimestampSchema,
  timeSchema,
  timeToMinutes,
  uuidSchema,
} from "./common";

export const appointmentStatusSchema = z.enum(["booked", "cancelled"]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const appointmentTitleSchema = z.string().trim().min(1).max(200);
export const appointmentDescriptionSchema = z.string().trim().max(2000);

export const appointmentCreateInputSchema = z
  .object({
    resourceId: uuidSchema,
    title: appointmentTitleSchema,
    description: appointmentDescriptionSchema.optional(),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((value) => timeToMinutes(value.endTime) > timeToMinutes(value.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type AppointmentCreateInput = z.infer<typeof appointmentCreateInputSchema>;

export const appointmentRescheduleInputSchema = z
  .object({
    title: appointmentTitleSchema,
    description: appointmentDescriptionSchema.optional(),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((value) => timeToMinutes(value.endTime) > timeToMinutes(value.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type AppointmentRescheduleInput = z.infer<
  typeof appointmentRescheduleInputSchema
>;

export const appointmentListQuerySchema = z.object({
  resourceId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  title: z.string().trim().max(200).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: appointmentStatusSchema.optional(),
});
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;

export const appointmentSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  /**
   * The owner's email, captured when the appointment was created. It is
   * denormalised so the appointment stays meaningful after the owner's account
   * is deleted — `userId` is then a historical reference that may match no user.
   */
  ownerEmail: z.string(),
  /**
   * The owner's display name at the time of booking, or null if they had not set
   * one. Use `appointmentOwnerLabel` to render: it falls back to `ownerEmail`,
   * which is the durable label that survives the owner's account being deleted.
   *
   * Nullable, not optional — see the note in `userSchema` about generic schema
   * inference.
   */
  ownerName: z.string().nullable(),
  resourceId: uuidSchema,
  title: appointmentTitleSchema,
  description: appointmentDescriptionSchema,
  startAt: isoTimestampSchema,
  endAt: isoTimestampSchema,
  startAtLocal: isoTimestampSchema,
  endAtLocal: isoTimestampSchema,
  status: appointmentStatusSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  cancelledAt: isoTimestampSchema.nullable(),
});
export type Appointment = z.infer<typeof appointmentSchema>;

export const appointmentListOutputSchema = z.object({
  appointments: z.array(appointmentSchema),
});
export type AppointmentListOutput = z.infer<typeof appointmentListOutputSchema>;

export const appointmentDeleteOutputSchema = z.object({
  status: z.literal("deleted"),
  id: uuidSchema,
});
export type AppointmentDeleteOutput = z.infer<typeof appointmentDeleteOutputSchema>;

/**
 * The name to show for an appointment's owner: their display name at booking
 * time, falling back to the email label captured alongside it. Unlike looking the
 * owner up by `userId`, this still resolves once the account is deleted.
 */
export function appointmentOwnerLabel(appointment: {
  ownerName: string | null;
  ownerEmail: string;
}): string {
  return appointment.ownerName?.trim() || appointment.ownerEmail;
}
