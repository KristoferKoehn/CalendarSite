import type { ErrorCode } from "@/contract";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    options: { status?: number; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = options.status ?? 0;
    this.details = options.details;
  }
}
