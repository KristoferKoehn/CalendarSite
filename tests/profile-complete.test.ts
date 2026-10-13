import { describe, expect, it } from "vitest";
import type { User } from "@/contract";
import { hasProfileDetails, isVerified } from "@/lib/profile-complete";

function user(over: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "a@example.com",
    role: "user",
    isAgent: false,
    emailVerifiedAt: "2026-10-13T00:00:00Z",
    displayName: null,
    birthMonth: null,
    birthDay: null,
    pronouns: null,
    jobTitle: null,
    bio: null,
    createdAt: "2026-10-01T00:00:00Z",
    ...over,
  };
}

describe("isVerified", () => {
  it("is true only once a stamp exists", () => {
    expect(isVerified(user())).toBe(true);
    expect(isVerified(user({ emailVerifiedAt: null }))).toBe(false);
  });

  it("is false for no user at all, so a missing session does not read as confirmed", () => {
    expect(isVerified(null)).toBe(false);
    expect(isVerified(undefined)).toBe(false);
  });
});

describe("hasProfileDetails", () => {
  it("needs a display name, because that is what others see", () => {
    expect(hasProfileDetails(user({ displayName: "Ada" }))).toBe(true);
    expect(hasProfileDetails(user({ displayName: null }))).toBe(false);
    expect(hasProfileDetails(user({ displayName: "" }))).toBe(false);
  });

  it("does not accept whitespace for a name", () => {
    // Otherwise a space would let somebody past the details screen without saying anything.
    expect(hasProfileDetails(user({ displayName: "   " }))).toBe(false);
    expect(hasProfileDetails(user({ displayName: "\t\n" }))).toBe(false);
    expect(hasProfileDetails(user({ displayName: "  Ada  " }))).toBe(true);
  });

  it("does not treat other fields as sufficient", () => {
    // A bio with no name still leaves every booking attributed to an address.
    expect(hasProfileDetails(user({ bio: "Lots to say", jobTitle: "Engineer" }))).toBe(false);
  });

  it("is false for no user at all", () => {
    expect(hasProfileDetails(null)).toBe(false);
    expect(hasProfileDetails(undefined)).toBe(false);
  });
});
