"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PROJECT_STATUS_LABEL,
  projectDraftSchema,
  type Project,
  type ProjectDraft,
  type ProjectStatus,
} from "@/contract";
import { getApiClient } from "@/lib/api";
import { CARD_SURFACE, PAGE_TITLE } from "@/lib/card";
import { cal } from "@/lib/paths";

/**
 * Adding a project, and seeing the ones already there.
 *
 * The point of this page is that a Godot export can be published without a rebuild: the archive is
 * uploaded, unpacked beside the site, and described by a document the landing page reads on the
 * next request. Nothing here touches the repository.
 *
 * Admin-only, and enforced on the server rather than here — the guard that wraps this route hides
 * the page from a non-admin, and the store refuses the write regardless.
 */

const api = getApiClient();

const EMPTY: ProjectDraft = {
  name: "",
  slug: "",
  description: "",
  status: "live",
  stack: "",
  when: String(new Date().getFullYear()),
  href: "",
};

const STATUSES: ProjectStatus[] = ["live", "soon", "archived"];

export default function AdminProjectsPage() {
  const [draft, setDraft] = useState<ProjectDraft>(EMPTY);
  const [game, setGame] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Loading the list is asynchronous, so the state changes land after an await rather than
  // synchronously inside the effect — which is what the lint rule against setState-in-effect is
  // about, and why this is an inline call rather than `void refresh()`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await api.listProjects();
      if (cancelled) return;
      if (result.ok) {
        setProjects(result.value);
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
    const result = await api.listProjects();
    if (result.ok) {
      setProjects(result.value);
      setListError(null);
    } else {
      setListError(result.error.message);
    }
  }

  function update<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setCreated(null);

    const parsed = projectDraftSchema.safeParse(draft);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!game && !parsed.data.href) {
      setFormError("Choose a game build, or give the address of a project hosted elsewhere.");
      return;
    }

    setBusy(true);
    const result = await api.createProject({
      name: parsed.data.name,
      slug: parsed.data.slug || undefined,
      description: parsed.data.description,
      status: parsed.data.status,
      stack: parsed.data.stack
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      when: parsed.data.when,
      href: parsed.data.href || undefined,
      game: game ?? undefined,
    });
    setBusy(false);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }
    setCreated(result.value);
    setDraft(EMPTY);
    setGame(null);
    // Clear the file input itself: state alone does not reset a file input, so the next submission
    // would silently send the previous build again.
    const input = document.getElementById("project-game") as HTMLInputElement | null;
    if (input) input.value = "";
    await refresh();
  }

  async function handleDelete(project: Project) {
    const result = await api.deleteProject(project.slug);
    if (!result.ok) {
      setListError(result.error.message);
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className={PAGE_TITLE}>Projects</h1>
        <Link href={cal("/users")} className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
          Accounts →
        </Link>
      </div>

      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Upload a Godot web export and describe it. The build is unpacked on the server and the
        description is saved beside it, so the landing page picks it up on the next visit — no
        rebuild, no deploy.
      </p>

      <form onSubmit={handleSubmit} className={`max-w-2xl space-y-5 p-4 ${CARD_SURFACE}`}>
        <Field label="Game build" hint="The .zip a Godot web export produces. Leave empty to describe a project hosted elsewhere." error={errors.game}>
          <input
            id="project-game"
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => setGame(event.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded file:border file:border-zinc-300 file:bg-transparent file:px-3 file:py-1 file:text-sm dark:file:border-zinc-700"
          />
          {game && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {game.name} · {(game.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
        </Field>

        <Field label="Title" hint="Shown as the card's heading, and it is the link." error={errors.name}>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            className={INPUT}
          />
        </Field>

        <Field
          label="Address"
          hint="Optional. Derived from the title. The game is served at /games/<address>/."
          error={errors.slug}
        >
          <input
            type="text"
            value={draft.slug ?? ""}
            onChange={(event) => update("slug", event.target.value)}
            placeholder="derived from the title"
            className={INPUT}
          />
        </Field>

        <Field label="Description" hint="A sentence or two. This is the only place the pitch lives." error={errors.description}>
          <textarea
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
            rows={4}
            className={INPUT}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" error={errors.status}>
            <select
              value={draft.status}
              onChange={(event) => update("status", event.target.value as ProjectStatus)}
              className={INPUT}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year" hint="Shown at the right edge of the card." error={errors.when}>
            <input
              type="text"
              value={draft.when}
              onChange={(event) => update("when", event.target.value)}
              className={INPUT}
            />
          </Field>
        </div>

        <Field label="Stack" hint="Comma separated, shown under the description." error={errors.stack}>
          <input
            type="text"
            value={draft.stack}
            onChange={(event) => update("stack", event.target.value)}
            placeholder="Godot, GDScript, WebAssembly"
            className={INPUT}
          />
        </Field>

        <Field
          label="Link"
          hint="Optional. Defaults to the uploaded build. Set it for a project that lives elsewhere, such as /calendar."
          error={errors.href}
        >
          <input
            type="text"
            value={draft.href ?? ""}
            onChange={(event) => update("href", event.target.value)}
            placeholder="/games/<address>/"
            className={INPUT}
          />
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        )}
        {created && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Added <span className="font-medium">{created.name}</span> — it is at{" "}
            <Link href={created.href} className="underline">
              {created.href}
            </Link>
            . Visit the <Link href="/" className="underline">landing page</Link> to see the card.
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Uploading…" : "Add project"}
        </button>
        {busy && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            A large build takes a while to upload. Nothing is visible until it has finished.
          </p>
        )}
      </form>

      <section className="max-w-2xl space-y-3">
        <h2 className="text-lg font-medium">Published</h2>
        {listError && <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>}
        {projects === null ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing published yet.</p>
        ) : (
          <ul className={`divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 ${CARD_SURFACE}`}>
            {projects.map((project) => (
              <li key={project.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{project.name}</p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {project.href} · {PROJECT_STATUS_LABEL[project.status]}
                  </p>
                </div>
                <Link href={project.href} className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(project)}
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

const INPUT =
  "mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
      {children}
      {error && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
