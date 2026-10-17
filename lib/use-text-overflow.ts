"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Whether an element's content is clipped by its own box.
 *
 * Used to decide whether a "Show more" control is worth showing. A control that expands something
 * already fully visible is a dead end: the reader clicks it, nothing changes, and they learn not to
 * trust the next one. Most descriptions on the appointments list are one short line, so most of
 * those controls did nothing.
 *
 * This cannot be decided while rendering. Whether text runs past two lines depends on the width it
 * is given, the font size, and the length — none of which the server knows, and the width changes
 * with the window. So it is measured after layout and re-measured when the box resizes.
 *
 * **Only measured while collapsed.** An expanded element is not clamped, so it never reports
 * overflow — measuring then would hide the control and strand the reader with no way back. The last
 * answer is kept, and re-measured when the element is clamped again.
 *
 * **No feedback loop.** Whether the control is shown can change the element's width, so a naive
 * version could oscillate. It cannot here: overflow is monotonic in width, so a box narrow enough to
 * overflow without the control still overflows with it. Once true it stays true, and once false the
 * control stays hidden and the box stays wide.
 */
export function useTextOverflow(text: string, expanded: boolean) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    // Expanded, there is no clamp to measure against. Keep the previous answer so the control
    // remains until the reader collapses it.
    if (expanded) return;

    const element = ref.current;
    if (!element) return;

    const measure = () => {
      // `scrollHeight` is the full content; `clientHeight` is the clipped box. The 1px slack
      // absorbs sub-pixel rounding, which otherwise reports overflow on text that fits exactly.
      const next = element.scrollHeight > element.clientHeight + 1;
      setOverflows((previous) => (previous === next ? previous : next));
    };

    measure();

    // A window resize reflows the text: a description that fitted on two lines can start needing
    // three. Without this the control would be missing at a width where it is needed.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);

  return { ref, overflows };
}
