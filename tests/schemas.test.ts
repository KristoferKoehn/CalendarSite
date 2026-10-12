import { describe, expect, it } from "vitest";
import {
  appointmentCreateInputSchema,
  appointmentListQuerySchema,
  errorEnvelopeSchema,
  loginInputSchema,
} from "@/contract";

describe("appointmentCreateInputSchema", () => {
  const valid = {
    resourceId: "3f2a7c1b-0000-4000-8000-000000000000",
    title: "Standup",
    date: "2026-10-10",
    startTime: "14:00",
    endTime: "15:00",
  };

  it("accepts valid input", () => {
    expect(appointmentCreateInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an optional description", () => {
    expect(
      appointmentCreateInputSchema.safeParse({ ...valid, description: "Daily sync" }).success,
    ).toBe(true);
  });

  it("rejects a missing title", () => {
    const result = appointmentCreateInputSchema.safeParse({
      resourceId: valid.resourceId,
      date: valid.date,
      startTime: valid.startTime,
      endTime: valid.endTime,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank title", () => {
    expect(
      appointmentCreateInputSchema.safeParse({ ...valid, title: "   " }).success,
    ).toBe(false);
  });

  it("rejects an over-limit title", () => {
    expect(
      appointmentCreateInputSchema.safeParse({ ...valid, title: "a".repeat(201) }).success,
    ).toBe(false);
  });

  it("rejects an over-limit description", () => {
    expect(
      appointmentCreateInputSchema.safeParse({ ...valid, description: "a".repeat(2001) }).success,
    ).toBe(false);
  });

  it("rejects endTime equal to startTime", () => {
    const result = appointmentCreateInputSchema.safeParse({ ...valid, endTime: "14:00" });
    expect(result.success).toBe(false);
  });

  it("rejects endTime before startTime", () => {
    const result = appointmentCreateInputSchema.safeParse({ ...valid, endTime: "13:00" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid time format", () => {
    const result = appointmentCreateInputSchema.safeParse({ ...valid, startTime: "2pm" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date format", () => {
    const result = appointmentCreateInputSchema.safeParse({ ...valid, date: "10/10/2026" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid resource id", () => {
    const result = appointmentCreateInputSchema.safeParse({ ...valid, resourceId: "nope" });
    expect(result.success).toBe(false);
  });
});

describe("appointmentListQuerySchema", () => {
  it("accepts a title filter", () => {
    expect(appointmentListQuerySchema.safeParse({ title: "standup" }).success).toBe(true);
  });
});

describe("loginInputSchema", () => {
  it("rejects an invalid email", () => {
    const result = loginInputSchema.safeParse({ email: "nope", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = loginInputSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("errorEnvelopeSchema", () => {
  it("accepts a valid envelope", () => {
    const result = errorEnvelopeSchema.safeParse({
      error: { code: "CONFLICT", message: "Overlapping booking", details: {} },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown code", () => {
    const result = errorEnvelopeSchema.safeParse({
      error: { code: "NOPE", message: "x" },
    });
    expect(result.success).toBe(false);
  });
});
