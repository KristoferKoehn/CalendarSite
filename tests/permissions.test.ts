import { describe, expect, it } from "vitest";
import { userSchema, type Appointment, type User } from "@/contract";
import { canDeleteAppointment, canModifyAppointment } from "@/lib/permissions";

function user(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "someone@example.com",
    displayName: null,
    birthMonth: null,
    birthDay: null,
    pronouns: null,
    jobTitle: null,
    bio: null,
    role: "user",
    isAgent: false,
    emailVerifiedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    userId: "11111111-1111-4111-8111-111111111111",
    ownerEmail: "someone@example.com",
    ownerName: null,
    resourceId: "33333333-3333-4333-8333-333333333333",
    title: "Standup",
    description: "",
    startAt: "2026-10-12T21:00:00Z",
    endAt: "2026-10-12T22:00:00Z",
    startAtLocal: "2026-10-12T14:00:00-07:00",
    endAtLocal: "2026-10-12T15:00:00-07:00",
    status: "booked",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    cancelledAt: null,
    ...overrides,
  };
}

describe("canModifyAppointment", () => {
  it("lets the owner change their own booking", () => {
    const owner = user();
    expect(canModifyAppointment(appointment(), owner)).toBe(true);
  });

  it("refuses someone else's booking", () => {
    const other = user({ id: "99999999-9999-4999-8999-999999999999" });
    expect(canModifyAppointment(appointment(), other)).toBe(false);
  });

  it("lets an admin change anyone's booking", () => {
    const admin = user({ id: "99999999-9999-4999-8999-999999999999", role: "admin" });
    expect(canModifyAppointment(appointment(), admin)).toBe(true);
  });

  it("refuses when nobody is signed in", () => {
    expect(canModifyAppointment(appointment(), null)).toBe(false);
  });
});

describe("the fixtures match the real contract", () => {
  it("a user fixture satisfies userSchema", () => {
    // These tests are only meaningful if the objects they use are shaped like what the
    // API actually returns. Parsing the fixture through the real schema is what stops
    // it drifting — this is how `emailVerifiedAt` was found to be missing.
    const parsed = userSchema.safeParse(user());
    expect(parsed.success).toBe(true);
  });

  it("an admin fixture also satisfies userSchema", () => {
    expect(userSchema.safeParse(user({ role: "admin" })).success).toBe(true);
  });
});

describe("canDeleteAppointment", () => {  it("is granted to admins", () => {
    expect(canDeleteAppointment(user({ role: "admin" }))).toBe(true);
  });

  it("is refused to ordinary users", () => {
    expect(canDeleteAppointment(user({ role: "user" }))).toBe(false);
  });

  it("is refused when nobody is signed in", () => {
    expect(canDeleteAppointment(null)).toBe(false);
  });

  it("is narrower than being able to modify, even for the owner", () => {
    // The important asymmetry: an owner may cancel and reschedule their own booking,
    // but deleting erases the record and the server reserves that for admins. If these
    // two ever collapsed into one rule, owners would be offered a button that fails.
    const owner = user();
    const own = appointment();
    expect(canModifyAppointment(own, owner)).toBe(true);
    expect(canDeleteAppointment(owner)).toBe(false);
  });

  it("does not depend on who owns the appointment", () => {
    // Delete is a role check, not an ownership check: an admin sees it on every row.
    const admin = user({ id: "99999999-9999-4999-8999-999999999999", role: "admin" });
    const someoneElses = appointment({ userId: "44444444-4444-4444-8444-444444444444" });
    expect(canDeleteAppointment(admin)).toBe(true);
    // And the appointment's owner is irrelevant to the answer.
    expect(someoneElses.userId).not.toBe(admin.id);
  });
});
