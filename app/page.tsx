import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { PROJECT_STATUS_LABEL } from "@/contract";
import { PortfolioAccount } from "@/components/portfolio-account";
import { RichText } from "@/components/rich-text";
import { ThemeToggle } from "@/components/theme-toggle";
import { indexLabel, notableStatus, projectMeta } from "@/lib/project-meta";
import { readProjects } from "@/lib/projects";

/**
 * What this page says about itself when it is pasted somewhere.
 *
 * The headline on the page and the blurb in an embed are the same sentence, so they are written once
 * here and used in both places — a link preview that disagrees with the page it points at is worse
 * than no preview at all.
 *
 * Open Graph is what most places read: a chat client, a social feed, an editor that unfurls a link.
 * The plain `description` covers everything older.
 */
const TAGLINE = "Software For The People";
const BLURB = "Small, complete applications, built properly.";

export const metadata: Metadata = {
  title: `${TAGLINE} — Kristofer Koehn`,
  description: BLURB,
  openGraph: {
    title: TAGLINE,
    description: BLURB,
    siteName: "Kristofer Koehn",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary",
    title: TAGLINE,
    description: BLURB,
  },
};

/**
 * The landing page.
 *
 * An index rather than a gallery: numbered rows on rules, type doing the work and no boxes. It is the
 * layout that ages best and the one that still reads as deliberate with one project or with ten.
 *
 * Everything in a row starts at the same left edge, past the number. The version before this indented
 * only the description, which left three ragged edges on every row and read as a mistake rather than a
 * decision.
 *
 * The frame — header, opening lines, footer — is prerendered. Only the list is dynamic, because it is
 * read over HTTP so that a project added through the admin form appears without a rebuild. The
 * Suspense boundary is not decoration: this app runs with `cacheComponents`, which refuses to
 * prerender a page that reads runtime data, and the build fails rather than degrading.
 */
export default function PortfolioPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 pb-10 pt-8 sm:pt-12">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        {/* The wordmark is the way home, which is what a wordmark is for, and `Link` because this
            page is a route — unlike the project rows below, which lead to separate programs. */}
        <Link href="/" className="font-semibold tracking-tight">
          Kristofer Koehn
        </Link>
        <nav className="flex items-center gap-4 text-sm sm:gap-5">
          <a
            href="mailto:hello@example.com"
            className="text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Contact
          </a>
          <ThemeToggle />
          {/* The way into the app, and — when an admin is signed in — the way to publish. */}
          <PortfolioAccount />
        </nav>
      </header>

      <main className="flex-1">
        <h1 className="mt-14 max-w-2xl text-balance text-3xl font-medium leading-[1.15] tracking-tight sm:mt-20 sm:text-4xl">
          {TAGLINE}
        </h1>
        <p className="mt-4 max-w-xl text-zinc-600 sm:text-lg dark:text-zinc-400">{BLURB}</p>

        <section id="projects" className="mt-12 sm:mt-16">
          <h2 className="sr-only">Projects</h2>
          <div className="flex items-baseline justify-between border-b border-zinc-200 pb-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Selected work</span>
            <span className="tabular-nums">
              {/* Its own boundary, because it is its own read. The fallback is empty rather than a
                  placeholder: the count arrives in milliseconds and a shifting number would be worse
                  than a number that appears. */}
              <Suspense fallback={null}>
                <ProjectCount />
              </Suspense>
            </span>
          </div>
          <Suspense fallback={<ProjectListFallback />}>
            <ProjectList />
          </Suspense>
        </section>
      </main>

      {/* No address here: the header already carries one, and the same mailto twice on a page with
          three rows on it is repetition rather than information. */}
      <footer className="mt-20 border-t border-zinc-200 pt-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Built with Next.js and Go.
      </footer>
    </div>
  );
}

/**
 * How many projects there are, or nothing while that is unknown.
 *
 * A count is worth a line: it tells a visitor whether this is a page with three things on it or a page
 * that failed to load. A year is not, which is what used to sit here — repeated on every row below it
 * and implying the list was dated rather than current.
 */
async function ProjectCount() {
  await connection();
  const projects = await readProjects();
  return projects.length > 0 ? `${projects.length} ${projects.length === 1 ? "project" : "projects"}` : "";
}

/** Says the list is coming, without claiming it is empty — those are different facts. */
function ProjectListFallback() {
  return (
    <div className="py-8" role="status">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading projects…</p>
    </div>
  );
}

/**
 * The rows.
 *
 * `connection()` is what marks this component as depending on a live request, which is what the read
 * actually is. Without it Next would try to evaluate it while prerendering and fail the build.
 */
async function ProjectList() {
  await connection();
  const projects = await readProjects();

  if (projects.length === 0) {
    return (
      <div className="py-8">
        <p className="text-zinc-500 dark:text-zinc-400">Nothing published yet.</p>
      </div>
    );
  }

  return (
    <ul>
      {projects.map((project, index) => {
        const meta = projectMeta(project);
        return (
          <li
            key={project.slug}
            className="group border-b border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex gap-3 py-7 sm:gap-4">
              {/* The number makes the left edge a decision rather than an accident, and turns a list
                  of two or three things into an index. Hidden from a screen reader: it is a visual
                  position, not information. */}
              <span
                aria-hidden="true"
                className="w-6 shrink-0 pt-1.5 text-xs tabular-nums text-zinc-400 transition-colors group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
              >
                {indexLabel(index)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {/* The name is the link, and it is the only link. A second "read more" would be a
                      second target for the same destination.

                      A plain anchor rather than `next/link`, because a row leads to an application and
                      not necessarily to a Next page: an uploaded game is served by a route handler,
                      and a client-side navigation to it asks the router for a page that does not
                      exist. A full navigation is also the honest thing — the game is a separate
                      program, not another view of this one. */}
                  <h3 className="text-lg font-medium">
                    <a
                      href={project.href}
                      className="rounded-sm underline-offset-4 group-hover:underline focus-visible:bg-zinc-100 focus-visible:underline focus-visible:outline-none dark:focus-visible:bg-zinc-800"
                    >
                      {project.name}
                    </a>
                  </h3>
                  {notableStatus(project.status) && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {PROJECT_STATUS_LABEL[project.status]}
                    </span>
                  )}
                </div>

                {/* The description may carry a little markdown — a link, emphasis, code — so it is
                    rendered rather than printed. Everything is escaped by construction; see
                    components/rich-text. */}
                <RichText
                  text={project.description}
                  className="mt-2 max-w-xl text-pretty text-zinc-600 dark:text-zinc-400"
                />

                {meta && <p className="mt-2.5 text-sm text-zinc-500 dark:text-zinc-400">{meta}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
