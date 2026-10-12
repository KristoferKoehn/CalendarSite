import { describe, expect, it } from "vitest";
import {
  appointmentCreateInputSchema,
  appointmentDeleteOutputSchema,
  appointmentListQuerySchema,
  appointmentSchema,
  errorEnvelopeSchema,
  loginInputSchema,
  userSchema,
} from "@/contract";

describe("appointmentSchema", () => {
  const valid = {
    id: "3f2a7c1b-0000-4000-8000-000000000001",
    userId: "3f2a7c1b-0000-4000-8000-000000000002",
    ownerEmail: "booker@example.com",
    resourceId: "3f2a7c1b-0000-4000-8000-000000000003",
    title: "Standup",
    description: "Daily sync",
    startAt: "2026-10-10T21:00:00Z",
    endAt: "2026-10-10T22:00:00Z",
    startAtLocal: "2026-10-10T14:00:00-07:00",
    endAtLocal: "2026-10-10T15:00:00-07:00",
    status: "booked",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    cancelledAt: null,
  };

  it("accepts a full appointment", () => {
    expect(appointmentSchema.safeParse(valid).success).toBe(true);
  });

  it("requires ownerEmail, since it outlives the owner account", () => {
    const { ownerEmail: _omitted, ...withoutOwner } = valid;
    expect(appointmentSchema.safeParse(withoutOwner).success).toBe(false);
  });

  it("accepts an ownerEmail that no longer matches any user", () => {
    expect(
      appointmentSchema.safeParse({ ...valid, ownerEmail: "deleted@example.com" }).success,
    ).toBe(true);
  });

  it("accepts a cancelled appointment with cancelledAt set", () => {
    expect(
      appointmentSchema.safeParse({
        ...valid,
        status: "cancelled",
        cancelledAt: "2026-10-05T00:00:00Z",
      }).success,
    ).toBe(true);
  });
});

describe("appointmentDeleteOutputSchema", () => {
  it("accepts the delete response", () => {
    expect(
      appointmentDeleteOutputSchema.safeParse({
        status: "deleted",
        id: "3f2a7c1b-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("rejects an unexpected status", () => {
    expect(
      appointmentDeleteOutputSchema.safeParse({
        status: "cancelled",
        id: "3f2a7c1b-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });
});

describe("userSchema", () => {
  it("accepts a user", () => {
    expect(
      userSchema.safeParse({
        id: "3f2a7c1b-0000-4000-8000-000000000002",
        email: "user@example.com",
        role: "user",
        isAgent: false,
        createdAt: "2026-10-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });
});

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
