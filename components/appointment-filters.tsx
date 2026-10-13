"use client";

import { useState, type RefObject } from "react";
import type { Resource } from "@/contract";
import {
  APPOINTMENT_SORT_LABELS,
  APPOINTMENT_SORTS,
  type AppointmentSort,
} from "@/lib/appointment-sort";
import type { OwnerOption } from "@/lib/appointment-owners";
import type { AppointmentView } from "@/lib/use-appointment-view";
import { CARD_SURFACE, ROW_PADDING } from "@/lib/card";

const CONTROL =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const LABEL = "block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

/**
 * The appointment filters.
 *
 * Kept behind a disclosure rather than always on screen: the common case is reading the
 * list, and a permanent wall of controls pushes the appointments themselves below the fold.
 * Sorting sits outside the disclosure because changing it is a reading preference rather
 * than a narrowing, and it is wanted often enough to be worth a click less.
 */
export function AppointmentFilters({
  view,
  titleRef,
  resources,
  owners,
  resultCount,
}: {
  view: AppointmentView;
  /** Passed separately because a ref read during render makes its container unsafe to read. */
  titleRef: RefObject<HTMLInputElement | null>;
  resources: Resource[];
  owners: OwnerOption[];
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);
  const { query } = view;

  // How many controls are actually narrowing the list, for the summary line. Sort is
  // excluded: it reorders rather than removes, so counting it would overstate the effect.
  const activeCount = [
    query.title,
    query.resourceId,
    query.status,
    view.owner,
    query.from,
    query.to,
  ].filter(Boolean).length;

  return (
    <div className={`${CARD_SURFACE} overflow-hidden`}>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${ROW_PADDING}`}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <span aria-hidden="true" className="text-xs text-zinc-400">
            {open ? "▾" : "▸"}
          </span>
          Filters
          {activeCount > 0 && (
            <span className="rounded bg-zinc-900 px-1.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
              {activeCount}
            </span>
          )}
        </button>

        <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          Sort
          <select
            value={view.sort}
            onChange={(event) => view.setSort(event.target.value as AppointmentSort)}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {APPOINTMENT_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {APPOINTMENT_SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </label>

        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {resultCount === 1 ? "1 appointment" : `${resultCount} appointments`}
        </span>

        {view.isFiltered && (
          <button
            type="button"
            onClick={view.clearAll}
            className="ml-auto text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="grid gap-3 border-t border-zinc-100 p-4 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={LABEL} htmlFor="filter-title">
              Title contains
            </label>
            {/* Uncontrolled on purpose: the value lives in the DOM and is pushed to the URL
                after a pause. A controlled box would need an effect writing the URL value
                back, which would overwrite whatever is being typed during the pause. */}
            <input
              id="filter-title"
              ref={titleRef}
              type="search"
              placeholder="Search titles"
              defaultValue={query.title ?? ""}
              onChange={(event) => view.onTitleInput(event.target.value)}
              className={`mt-1 ${CONTROL}`}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="filter-resource">
              Room
            </label>
            {/* Sorted on arrival by the caller, so this reads alphabetically. */}
            <select
              id="filter-resource"
              value={query.resourceId ?? ""}
              onChange={(event) => view.setResourceId(event.target.value || undefined)}
              className={`mt-1 ${CONTROL}`}
            >
              <option value="">Any room</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="filter-owner">
              Booked by
            </label>
            {/* Derived from the appointments on screen, because the user list is
                admin-only while every user can read every appointment. */}
            <select
              id="filter-owner"
              value={view.owner ?? ""}
              onChange={(event) => view.setOwner(event.target.value || undefined)}
              className={`mt-1 ${CONTROL}`}
            >
              <option value="">Anyone</option>
              {owners.map((owner) => (
                <option key={owner.email} value={owner.email}>
                  {owner.label} ({owner.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              value={query.status ?? ""}
              onChange={(event) =>
                view.setStatus(
                  event.target.value === "booked" || event.target.value === "cancelled"
                    ? event.target.value
                    : undefined,
                )
              }
              className={`mt-1 ${CONTROL}`}
            >
              <option value="">Any status</option>
              <option value="booked">Booked</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
            <div>
              <label className={LABEL} htmlFor="filter-from">
                From
              </label>
              <input
                id="filter-from"
                type="date"
                value={query.from ?? ""}
                onChange={(event) => view.setFrom(event.target.value || undefined)}
                className={`mt-1 ${CONTROL}`}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="filter-to">
                Up to
              </label>
              <input
                id="filter-to"
                type="date"
                value={query.to ?? ""}
                onChange={(event) => view.setTo(event.target.value || undefined)}
                className={`mt-1 ${CONTROL}`}
              />
            </div>
          </div>

          {/* The range is half-open at both ends by design, and a silently empty result is
              the usual way that surprises somebody. */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
            From is inclusive and Up to is exclusive: a booking on the “Up to” date is not
            included. Leave both empty for every date.
          </p>
        </div>
      )}
    </div>
  );
}
