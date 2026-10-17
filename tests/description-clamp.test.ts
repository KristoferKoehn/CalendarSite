import { describe, expect, it } from "vitest";
import {
  CLAMPED_DESCRIPTION,
  CLAMPED_DESCRIPTION_HEIGHT,
  RESERVED_DESCRIPTION,
  descriptionClasses,
} from "@/lib/description-clamp";

/**
 * The description block's height rules, shared by the appointments list and the day/kiosk agenda.
 *
 * The height is what makes a list of rows uniform, and each of the three rules below exists because
 * the version before it was visibly wrong on the live site.
 */

describe("descriptionClasses", () => {
  it("clamps and reserves the height when collapsed", () => {
    const classes = descriptionClasses(false, true);
    expect(classes).toBe(CLAMPED_DESCRIPTION);
    expect(classes).toContain("line-clamp-2");
    expect(classes).toContain(CLAMPED_DESCRIPTION_HEIGHT);
  });

  it("releases both when expanded with text to show", () => {
    expect(descriptionClasses(true, true)).toBe("");
  });

  it("keeps the reserved height when there is no text", () => {
    // The shrink bug: with the block always rendered, expanding a row without a description
    // dropped the min-height and the row contracted. Nothing to reveal means nothing changes.
    expect(descriptionClasses(true, false)).toBe(RESERVED_DESCRIPTION);
    expect(descriptionClasses(false, false)).toBe(RESERVED_DESCRIPTION);
  });

  it("gives a row with no text the same reserved height as a collapsed one", () => {
    // The property is the height, not the classes: an empty row needs the reserve but has nothing
    // to clamp, so it carries `min-h` alone. Asserting the strings were equal was testing the
    // wrong thing.
    const withText = descriptionClasses(false, true);
    const withoutText = descriptionClasses(false, false);
    expect(withText).toContain(CLAMPED_DESCRIPTION_HEIGHT);
    expect(withoutText).toContain(CLAMPED_DESCRIPTION_HEIGHT);
  });

  it("never shrinks when going from collapsed to expanded", () => {
    // Stated as the property rather than the strings: expanded must reserve at least as much as
    // collapsed, for both cases. This is the invariant a future edit is most likely to break.
    for (const hasText of [true, false]) {
      const collapsed = descriptionClasses(false, hasText);
      const expanded = descriptionClasses(true, hasText);
      const reservesHeight = (c: string) => c.includes(CLAMPED_DESCRIPTION_HEIGHT);
      // Expanded either keeps the reserve or takes its own height from the text, which is only
      // safe when there is text. It may never drop the reserve with nothing to fill it.
      if (!hasText) expect(reservesHeight(expanded)).toBe(true);
      expect(reservesHeight(collapsed)).toBe(true);
    }
  });
});

describe("the constants", () => {
  it("use a line clamp rather than a max-height", () => {
    // A max-height would cut a line in half; line-clamp truncates at a boundary.
    expect(CLAMPED_DESCRIPTION).toContain("line-clamp-2");
    expect(CLAMPED_DESCRIPTION).not.toContain("max-h-");
  });

  it("reserve two lines of text-sm", () => {
    // 2.5rem, measured from the tall rows on the live list rather than assumed.
    expect(CLAMPED_DESCRIPTION_HEIGHT).toBe("min-h-[2.5rem]");
  });
});
