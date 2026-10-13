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
  // This is the guard the sign-up form runs before submitting, so its behaviour is what
  // decides whether a half-filled birthday is refused rather than quietly sent.
  it("accepts credentials alone", () => {
    const parsed = registerInputSchema.safeParse({ email: "a@b.com", password: "password123" });
    expect(parsed.success).toBe(true);
  });

  it("refuses a half-filled birthday, from either direction", () => {
    for (const birthday of [{ birthMonth: 6 }, { birthDay: 15 }]) {
      const parsed = registerInputSchema.safeParse({
        email: "a@b.com", password: "password123", ...birthday,
      });
      expect(parsed.success).toBe(false);
    }
  });

  it("accepts a complete birthday", () => {
    const parsed = registerInputSchema.safeParse({
      email: "a@b.com", password: "password123", birthMonth: 6, birthDay: 15,
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses a birthday out of range", () => {
    for (const birthday of [
      { birthMonth: 13, birthDay: 1 },
      { birthMonth: 0, birthDay: 1 },
      { birthMonth: 6, birthDay: 32 },
      { birthMonth: 6, birthDay: 0 },
    ]) {
      const parsed = registerInputSchema.safeParse({
        email: "a@b.com", password: "password123", ...birthday,
      });
      expect(parsed.success).toBe(false);
    }
  });

  it("accepts a draft converted from a fully blank form", () => {
    // The end-to-end path the sign-up page takes: blank optional section, converted, parsed.
    const parsed = registerInputSchema.safeParse({
      email: "a@b.com", password: "password123", ...draftToProfile(emptyProfileDraft),
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses a draft converted from a half-filled form", () => {
    // Two separate guards, deliberately. The schema catches a half birthday sent directly,
    // and draftToProfile refuses to produce one in the first place — so there is no path
    // where a half-filled form becomes a valid payload meaning "no birthday".
    const partial = draft({ birthMonth: "6" });
    expect(birthdayIsPartial(partial)).toBe(true);
    expect(() => draftToProfile(partial)).toThrow();
  });
});
