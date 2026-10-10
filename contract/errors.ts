import { z } from "zod";

export const ErrorCodes = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const errorCodeValues = Object.values(ErrorCodes) as [ErrorCode, ...ErrorCode[]];

export const errorCodeSchema = z.enum(errorCodeValues);

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
