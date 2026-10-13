import { describe, expect, it } from "vitest";
import {
  appointmentCreateInputSchema,
  appointmentDeleteOutputSchema,
  appointmentListQuerySchema,
  appointmentOwnerLabel,
  appointmentSchema,
  errorEnvelopeSchema,
  formatBirthday,
  loginInputSchema,
  profileUpdateInputSchema,
  userLabel,
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
  const base = {
    id: "3f2a7c1b-0000-4000-8000-000000000002",
    email: "user@example.com",
    role: "user",
    isAgent: false,
    createdAt: "2026-10-01T00:00:00Z",
  };

  it("accepts a user with no profile details", () => {
    const parsed = userSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.displayName).toBeNull();
      expect(parsed.data.birthMonth).toBeNull();
      expect(parsed.data.bio).toBeNull();
    }
  });

  it("accepts a user with profile details", () => {
    expect(
      userSchema.safeParse({
        ...base,
        displayName: "Jane Doe",
        birthMonth: 3,
        birthDay: 14,
        pronouns: "she/her",
        jobTitle: "Engineer",
        bio: "Runs the Thursday sync.",
      }).success,
    ).toBe(true);
  });

  it("still parses a response from an older build with no profile keys", () => {
    // Absent keys are normalised rather than rejected.
    const parsed = userSchema.safeParse({ ...base, displayName: undefined });
    expect(parsed.success).toBe(true);
  });
});

describe("userLabel", () => {
  it("prefers the display name", () => {
    expect(userLabel({ displayName: "Jane", email: "jane@example.com" })).toBe("Jane");
  });
  it("falls back to the email when there is no name", () => {
    expect(userLabel({ displayName: null, email: "jane@example.com" })).toBe("jane@example.com");
  });
  it("treats a blank name as unset", () => {
    expect(userLabel({ displayName: "   ", email: "jane@example.com" })).toBe("jane@example.com");
  });
});

describe("formatBirthday", () => {
  it("renders month and day", () => {
    expect(formatBirthday(3, 14)).toBe("March 14");
  });
  it("returns null when unset", () => {
    expect(formatBirthday(null, null)).toBeNull();
  });
});

describe("profileUpdateInputSchema", () => {
  it("accepts a partial update", () => {
    expect(profileUpdateInputSchema.safeParse({ displayName: "Jane" }).success).toBe(true);
  });

  it("accepts explicit nulls to clear values", () => {
    expect(
      profileUpdateInputSchema.safeParse({ displayName: null, bio: null }).success,
    ).toBe(true);
  });

  it("accepts a paired birthday", () => {
    expect(
      profileUpdateInputSchema.safeParse({ birthMonth: 3, birthDay: 14 }).success,
    ).toBe(true);
  });

  it("rejects a birth month without a day", () => {
    expect(profileUpdateInputSchema.safeParse({ birthMonth: 3 }).success).toBe(false);
  });

  it("rejects an out-of-range birth month", () => {
    expect(
      profileUpdateInputSchema.safeParse({ birthMonth: 13, birthDay: 1 }).success,
    ).toBe(false);
  });

  it("rejects an over-long bio", () => {
    expect(profileUpdateInputSchema.safeParse({ bio: "x".repeat(501) }).success).toBe(false);
  });
});

describe("appointmentOwnerLabel", () => {
  it("prefers the name captured at booking", () => {
    expect(
      appointmentOwnerLabel({ ownerName: "Jane", ownerEmail: "jane@example.com" }),
    ).toBe("Jane");
  });
  it("falls back to the email label", () => {
    expect(
      appointmentOwnerLabel({ ownerName: null, ownerEmail: "jane@example.com" }),
    ).toBe("jane@example.com");
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
