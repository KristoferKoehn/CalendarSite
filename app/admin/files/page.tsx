"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoredFile } from "@/contract";
import { getApiClient } from "@/lib/api";
import { CARD_SURFACE, PAGE_TITLE } from "@/lib/card";
import { fileHref } from "@/lib/files";
import { adminPath, cal } from "@/lib/paths";

/**
 * The file shelf.
 *
 * Upload a file, copy its link, delete it. Separate from projects on purpose: a project's archive
 * belongs to the project and goes when the card does, whereas a file here belongs to nobody and
 * outlives whatever page happens to link to it.
 *
 * Links are absolute, because the only thing anybody does with them is paste them somewhere else.
 */

const api = getApiClient();

export default function AdminFilesPage() {
  const [files, setFiles] = useState<StoredFile[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<StoredFile | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Asynchronous, so the state changes land after an await rather than synchronously in the effect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await api.listFiles();
      if (cancelled) return;
      if (result.ok) {
        setFiles(result.value);
        setListError(null);
      } else {
        setListError(result.error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    const result = await api.listFiles();
    if (result.ok) {
      setFiles(result.value);
      setListError(null);
    } else {
      setListError(result.error.message);
    }
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setUploaded(null);
    if (!chosen) {
      setFormError("Choose a file to upload.");
      return;
    }

    setBusy(true);
    const result = await api.uploadFile(chosen, name.trim() || undefined);
    setBusy(false);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }
    setUploaded(result.value);
    setChosen(null);
    setName("");
    // The file input holds its own value; state alone does not clear it, so the next upload would
    // silently send the same file again.
    const input = document.getElementById("shelf-file") as HTMLInputElement | null;
    if (input) input.value = "";
    await refresh();
  }

  async function handleDelete(file: StoredFile) {
    const result = await api.deleteFile(file.name);
    if (!result.ok) {
      setListError(result.error.message);
      return;
    }
    await refresh();
  }

  async function copyLink(file: StoredFile) {
    const href = fileHref(file.name, window.location.origin);
    try {
      await navigator.clipboard.writeText(href);
      setCopied(file.name);
      window.setTimeout(() => setCopied((current) => (current === file.name ? null : current)), 2000);
    } catch {
      // Clipboard access can be refused, and a button that silently does nothing is worse than one
      // that tells you to copy it yourself.
      setFormError("The clipboard was refused. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className={PAGE_TITLE}>Files</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href={adminPath("/projects")} className="text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            Projects →
          </Link>
          <Link href={adminPath("/downloads")} className="text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            Downloads →
          </Link>
          <Link href={cal("/users")} className="text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            Accounts →
          </Link>
        </div>
      </div>

      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Files that belong to no project. Each one gets a public link you can paste anywhere — the file
        is served as it is, so a picture shows and an archive downloads.
      </p>

      <form onSubmit={handleUpload} className={`max-w-2xl space-y-4 p-4 ${CARD_SURFACE}`}>
        <div>
          <span className="block text-sm font-medium">File</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            Up to 150 MB. The name is cleaned up, and an existing name is never overwritten.
          </span>
          <input
            id="shelf-file"
            type="file"
            onChange={(event) => setChosen(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded file:border file:border-zinc-300 file:bg-transparent file:px-3 file:py-1 file:text-sm dark:file:border-zinc-700"
          />
          {chosen && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {chosen.name} · {(chosen.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium">Name</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            Optional. Useful when the file came out of a tool with an unhelpful name.
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="taken from the file"
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        )}
        {uploaded && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Added <span className="font-medium">{uploaded.name}</span> —{" "}
            <a href={fileHref(uploaded.name)} className="underline">
              open it
            </a>
            .
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </form>

      <section className="max-w-2xl space-y-3">
        <h2 className="text-lg font-medium">On the shelf</h2>
        {listError && <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>}
        {files === null ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No files yet.</p>
        ) : (
          <ul
            className={`divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 ${CARD_SURFACE}`}
          >
            {files.map((file) => (
              <li key={file.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatSize(file.size)} · {formatDate(file.modifiedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(file)}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {copied === file.name ? "Copied" : "Copy link"}
                </button>
                <a
                  href={fileHref(file.name)}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  className="rounded border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
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
