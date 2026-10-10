import type { ErrorCode } from "@/contract";
import type { ApiError } from "./errors";

const FALLBACKS: Record<ErrorCode, string> = {
  INVALID_INPUT: "Invalid input.",
  UNAUTHENTICATED: "You are not signed in.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "Not found.",
  CONFLICT: "That conflicts with an existing item.",
  INTERNAL: "Something went wrong.",
};

export function errorMessage(error: ApiError): string {
  return error.message || FALLBACKS[error.code];
}
