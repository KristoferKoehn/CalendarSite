import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();

export const uuidSchema = z.string().uuid();

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "time must be HH:mm in 24-hour format");

export const isoTimestampSchema = z.string().datetime({ offset: true });

export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
