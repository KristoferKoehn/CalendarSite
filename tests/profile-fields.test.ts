import { describe, expect, it } from "vitest";
import { registerInputSchema } from "@/contract";
import {
  birthdayIsPartial,
  draftToProfile,
  emptyProfileDraft,
  profileDraft,
  type ProfileDraft,
} from "@/components/profile-fields";

const draft = (over: Partial<ProfileDraft>): ProfileDraft => ({ ...emptyProfileDraft, ...over });

describe("draftToProfile", () => {
  it("turns blank text into null, which is how the API is told to clear a field", () => {
    // Not undefined: omitting a field would leave the old value in place, so blanking your
    // own job title would silently do nothing.
    const result = draftToProfile(draft({ displayName: "", jobTitle: "  " }));
    expect(result.displayName).toBeNull();
    expect(result.jobTitle).toBeNull();
  });

  it("trims what it sends", () => {
    const result = draftToProfile(draft({ displayName: "  Ada  ", bio: " hello " }));
    expect(result.displayName).toBe("Ada");
    expect(result.bio).toBe("hello");
  });

  it("omits the birthday when registering with both parts blank", () => {
    // A new account has no birthday to clear, so sending an explicit null pair would be a
    // request to clear something that was never set.
    const result = draftToProfile(draft({ birthMonth: "", birthDay: "" }));
    expect("birthMonth" in result).toBe(false);
    expect("birthDay" in result).toBe(false);
  });

  it("sends an explicit null pair when editing, to remove a stored birthday", () => {
    const result = draftToProfile(draft({ birthMonth: "", birthDay: "" }), {
      clearWhenEmpty: true,
    });
    expect(result.birthMonth).toBeNull();
    expect(result.birthDay).toBeNull();
  });

  it("sends both parts as numbers when they are filled in", () => {
    const result = draftToProfile(draft({ birthMonth: "6", birthDay: "15" }));
    expect(result.birthMonth).toBe(6);
    expect(result.birthDay).toBe(15);
  });

  it("refuses to convert a half-filled form at all", () => {
    // Dropping the half pair would produce a payload that is valid and quietly means "no
    // birthday", so a caller that forgot to check would save the wrong thing and report
    // success. The page checks first and shows the reason; this makes the mistake loud if
    // that check is ever removed.
    for (const partial of [
      draft({ birthMonth: "6", birthDay: "" }),
      draft({ birthMonth: "", birthDay: "15" }),
    ]) {
      expect(() => draftToProfile(partial)).toThrow(/birthdayIsPartial/);
      expect(birthdayIsPartial(partial)).toBe(true);
    }
  });
});

describe("birthdayIsPartial", () => {
  it("is true only when exactly one part is filled", () => {
    expect(birthdayIsPartial(draft({ birthMonth: "6", birthDay: "" }))).toBe(true);
    expect(birthdayIsPartial(draft({ birthMonth: "", birthDay: "15" }))).toBe(true);
    expect(birthdayIsPartial(draft({ birthMonth: "6", birthDay: "15" }))).toBe(false);
    expect(birthdayIsPartial(draft({}))).toBe(false);
  });
});

describe("profileDraft", () => {
  it("reads a stored profile back into the form", () => {
    expect(
      profileDraft({
        displayName: "Ada", birthMonth: 6, birthDay: 15,
        pronouns: "she/her", jobTitle: "Engineer", bio: "Hi",
      }),
    ).toEqual({
      displayName: "Ada", birthMonth: "6", birthDay: "15",
      pronouns: "she/her", jobTitle: "Engineer", bio: "Hi",
    });
  });

  it("gives an empty draft for a profile with nothing set", () => {
    expect(profileDraft(null)).toEqual(emptyProfileDraft);
  });
});

describe("registerInputSchema", () => {
  // The sign-up form is two fields now. Confirmation gates access, and the details are
  // collected on the screen the link leads to, so anything beyond credentials is ignored.
  it("accepts an address and a password", () => {
    const parsed = registerInputSchema.safeParse({ email: "a@b.com", password: "password123" });
    expect(parsed.success).toBe(true);
  });

  it("still refuses a short password and a malformed address", () => {
    expect(registerInputSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
    expect(registerInputSchema.safeParse({ email: "nope", password: "password123" }).success).toBe(false);
  });

  it("does not carry profile fields any more", () => {
    // Extra keys are stripped rather than stored, which is what makes a stale client that
    // still sends them harmless.
    const parsed = registerInputSchema.safeParse({
      email: "a@b.com", password: "password123", displayName: "Ignored", birthMonth: 6,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "displayName" in parsed.data).toBe(false);
    expect(parsed.success && "birthMonth" in parsed.data).toBe(false);
  });

  it("accepts a draft converted from a fully blank form", () => {
    // The end-to-end path the sign-up page takes: credentials only.
    const parsed = registerInputSchema.safeParse({
      email: "a@b.com", password: "password123", ...draftToProfile(emptyProfileDraft),
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses a draft converted from a half-filled form", () => {
    // The details screen runs this, and draftToProfile refuses to produce a half birthday at
    // all — so there is no path where a half-filled form becomes a valid payload meaning
    // "no birthday".
    const partial = draft({ birthMonth: "6" });
    expect(birthdayIsPartial(partial)).toBe(true);
    expect(() => draftToProfile(partial)).toThrow();
  });
});
