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

export const appointmentCreateInputSchema = z
  .object({
    resourceId: uuidSchema,
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
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: appointmentStatusSchema.optional(),
});
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;

export const appointmentSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  resourceId: uuidSchema,
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
