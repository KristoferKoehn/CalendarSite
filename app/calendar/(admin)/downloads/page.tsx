"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Download } from "@/contract";
import { getApiClient } from "@/lib/api";
import { CARD_SURFACE, PAGE_TITLE } from "@/lib/card";
import { cal } from "@/lib/paths";

/**
 * The downloads inventory.
 *
 * A download is created by a project — it is what the card hands over — but it is also a file: it has
 * an address, a size, and a link somebody may have pasted into a message. Seen only as a checkbox
 * inside a project form, none of that is visible, and there was no way to answer "what does this site
 * hand out, and what are the links".
 *
 * It is not the place to upload one. Creating a download means creating the project that offers it,
 * because a file with no card is a file nobody can find; the Files shelf is for those. That separation
 * is why this page has no upload form.
 *
 * Deleting is offered only for an archive no project points at, because removing an owned one would
 * leave a card offering a file that is not there — a link that looks right and 404s.
 */
const api = getApiClient();

export default function AdminDownloadsPage() {
  const [downloads, setDownloads] = useState<Download[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await api.listDownloads();
      if (cancelled) return;
      if (result.ok) {
        setDownloads(result.value);
        setError(null);
      } else {
        setError(result.error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    const result = await api.listDownloads();
    if (result.ok) {
      setDownloads(result.value);
      setError(null);
    } else {
      setError(result.error.message);
    }
  }

  async function copyLink(download: Download) {
    const href = `${window.location.origin}${download.href}`;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(download.slug);
      window.setTimeout(() => setCopied((current) => (current === download.slug ? null : current)), 2000);
    } catch {
      setError("The clipboard was refused. Select the link and copy it by hand.");
    }
  }

  async function handleDelete(download: Download) {
    const result = await api.deleteDownload(download.slug);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className={PAGE_TITLE}>Downloads</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={cal("/projects")} className="text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            Projects →
          </Link>
          <Link href={cal("/files")} className="text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            Files →
          </Link>
        </div>
      </div>

      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        The archives this site hands over, each with its own address. They are created by a project —
        a card with the download box ticked — so a way to remove one is to delete its project. Files
        that belong to no project are on the{" "}
        <Link href={cal("/files")} className="underline">
          Files
        </Link>{" "}
        shelf.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {downloads === null ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : downloads.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nothing yet. Tick “Offer this as a download” on a project and upload a file, and it will
          appear here with a link.
        </p>
      ) : (
        <ul className={`max-w-3xl divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 ${CARD_SURFACE}`}>
          {downloads.map((download) => (
            <li key={download.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{download.href}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatSize(download.size)} · {formatDate(download.modifiedAt)}
                  {" · "}
                  {download.projectName ? (
                    <>
                      offered by{" "}
                      <Link href={cal("/projects")} className="underline underline-offset-2">
                        {download.projectName}
                      </Link>
                    </>
                  ) : (
                    // An archive nothing points at: the card was removed without it, or it was left by
                    // a failed delete. Worth naming, because it is taking up space for no reason.
                    <span className="text-amber-700 dark:text-amber-500">no project points at this</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyLink(download)}
                className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {copied === download.slug ? "Copied" : "Copy link"}
              </button>
              <a
                href={download.href}
                className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Download
              </a>
              {download.projectSlug === "" && (
                <button
                  type="button"
                  onClick={() => handleDelete(download)}
                  className="rounded border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}
