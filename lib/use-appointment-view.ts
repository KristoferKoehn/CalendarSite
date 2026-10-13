"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AppointmentListQuery } from "@/contract";
import { DEFAULT_APPOINTMENT_SORT, isAppointmentSort, type AppointmentSort } from "@/lib/appointment-sort";

const SEARCH_DEBOUNCE_MS = 350;

/** The date input gives `YYYY-MM-DD`, which is what the API wants, but only if it is well formed. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const asDate = (value: string | null) => (value && DATE_PATTERN.test(value) ? value : undefined);

export type AppointmentView = {
  /** What to send to the API. */
  query: AppointmentListQuery;
  sort: AppointmentSort;
  /** The owner's email being filtered on, for the select to highlight. */
  owner: string | undefined;
  /** Called on every keystroke; the URL is updated after a pause. */
  onTitleInput: (value: string) => void;
  setResourceId: (value: string | undefined) => void;
  setStatus: (value: "booked" | "cancelled" | undefined) => void;
  setOwner: (email: string | undefined) => void;
  setFrom: (value: string | undefined) => void;
  setTo: (value: string | undefined) => void;
  setSort: (value: AppointmentSort) => void;
  clearAll: () => void;
  /** Whether any narrowing is in effect, so the UI can offer to clear it. */
  isFiltered: boolean;
};

/**
 * Keeps the appointment filters in the URL, so a narrowed view can be linked, bookmarked
 * and reloaded rather than living only in component state.
 *
 * The ref for the search box is returned separately from the rest, because a ref that is
 * reachable while rendering makes the whole object unsafe to read during render — the
 * linter refuses to tell the difference, and it is right not to guess.
 */
export function useAppointmentView(): {
  view: AppointmentView;
  titleRef: RefObject<HTMLInputElement | null>;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortParam = searchParams.get("sort");
  const titleParam = searchParams.get("title") ?? "";
  const resourceId = searchParams.get("resourceId") ?? undefined;
  const statusParam = searchParams.get("status");
  const owner = searchParams.get("owner") ?? undefined;
  const from = asDate(searchParams.get("from"));
  const to = asDate(searchParams.get("to"));

  const titleRef = useRef<HTMLInputElement | null>(null);
  const sort: AppointmentSort = isAppointmentSort(sortParam)
    ? sortParam
    : DEFAULT_APPOINTMENT_SORT;

  /**
   * Change one parameter, leaving the rest alone.
   *
   * Uses `replace` rather than `push`: narrowing a list is not a navigation, and pushing
   * would fill the history stack so that Back appeared to do nothing but undo filters.
   * `scroll: false` keeps the list where it is.
   */
  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /**
   * Apply the text filter after a pause, not on every keystroke.
   *
   * A request per character is both wasteful and visibly janky as results reshuffle. The
   * box itself is uncontrolled and read through a ref, so there is no state to synchronise
   * and nothing for this effect to write back: doing that would clobber whatever is being
   * typed during the pause.
   */
  const debounced = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTitleInput(value: string) {
    if (debounced.current) clearTimeout(debounced.current);
    debounced.current = setTimeout(() => setParam("title", value), SEARCH_DEBOUNCE_MS);
  }

  // Cancel a pending change if the component goes away, so it cannot fire against a URL
  // the reader has already left.
  useEffect(() => {
    return () => {
      if (debounced.current) clearTimeout(debounced.current);
    };
  }, []);

  return {
    view: {
      query: {
        title: titleParam || undefined,
        resourceId,
        status: statusOf(statusParam),
        from,
        to,
      },
      sort,
      owner,
      onTitleInput: handleTitleInput,
      setResourceId: (value) => setParam("resourceId", value),
      setStatus: (value) => setParam("status", value),
      setOwner: (value) => setParam("owner", value),
      setFrom: (value) => setParam("from", value),
      setTo: (value) => setParam("to", value),
      setSort: (value) =>
        setParam("sort", value === DEFAULT_APPOINTMENT_SORT ? undefined : value),
      clearAll: () => {
        if (debounced.current) clearTimeout(debounced.current);
        // Reset the box directly rather than through state: it is uncontrolled, so the DOM
        // is the only place its value lives.
        if (titleRef.current) titleRef.current.value = "";
        router.replace(pathname, { scroll: false });
      },
      isFiltered: Boolean(
        titleParam || resourceId || statusParam || owner || from || to || sortParam,
      ),
    },
    titleRef,
  };
}

function statusOf(value: string | null): "booked" | "cancelled" | undefined {
  return value === "booked" || value === "cancelled" ? value : undefined;
}
