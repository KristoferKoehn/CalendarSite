import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { PROJECT_STATUS_LABEL } from "@/contract";
import { PortfolioAccount } from "@/components/portfolio-account";
import { RichText } from "@/components/rich-text";
import { ThemeToggle } from "@/components/theme-toggle";
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
 * An index rather than a gallery: names on rules, type doing the work and no boxes. It is the layout
 * that ages best and the one that still reads as deliberate with one project or with ten.
 *
 * The frame — header, opening lines, footer — is prerendered. Only the list is dynamic, because it
 * is read from disk so that a project added through the admin form appears without a rebuild.
 *
 * The Suspense boundary is not decoration: this app runs with `cacheComponents`, which refuses to
 * prerender a page that reads runtime data, and the build fails rather than degrading. Streaming the
 * list is how the frame stays static while the cards do not.
 */
export default function PortfolioPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:py-14">
      <header className="flex items-baseline justify-between gap-4">
        <p className="font-semibold">Kristofer Koehn</p>
        <div className="flex items-center gap-5">
          <a href="#projects" className="text-zinc-500 hover:underline dark:text-zinc-400">
            Work
          </a>
          <a href="mailto:hello@example.com" className="text-zinc-500 hover:underline dark:text-zinc-400">
            About
          </a>
          <ThemeToggle />
          {/* The way into the app, and — when an admin is signed in — the way to publish. */}
          <PortfolioAccount />
        </div>
      </header>

      <main className="flex-1">
        <h1 className="mt-16 max-w-xl text-balance text-2xl font-medium leading-snug sm:mt-24 sm:text-3xl">
          {TAGLINE}
        </h1>
        <p className="mt-5 max-w-xl text-zinc-600 dark:text-zinc-400">{BLURB}</p>

        <section id="projects" className="mt-16 sm:mt-20">
          <div className="flex items-baseline justify-between border-b border-zinc-200 pb-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Selected projects</span>
            <span>2026</span>
          </div>
          <Suspense fallback={<ProjectListFallback />}>
            <ProjectList />
          </Suspense>
        </section>
      </main>

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Built with Next.js and Go. Say hello ·{" "}
        <a href="mailto:hello@example.com" className="underline underline-offset-4">
          hello@example.com
        </a>
      </footer>
    </div>
  );
}

/** Says the list is coming, without claiming it is empty — those are different facts. */
function ProjectListFallback() {
  return <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">Loading projects…</p>;
}

/**
 * The cards.
 *
 * `connection()` is what marks this component as depending on a live request, which is what the
 * filesystem read actually is. Without it Next would try to evaluate the read while prerendering and
 * fail the build.
 */
async function ProjectList() {
  await connection();
  const projects = await readProjects();

  if (projects.length === 0) {
    return <p className="mt-8 text-zinc-500 dark:text-zinc-400">Nothing published yet.</p>;
  }

  return (
    <ul>
      {projects.map((project) => (
        <li key={project.slug} className="border-b border-zinc-200 py-9 dark:border-zinc-800">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            {/* The name is the link, and it is the only link. A second "read more" would be a
                second target for the same destination.

                A plain anchor rather than `next/link`, because a card leads to an application and
                not necessarily to a Next page: an uploaded game is served by a route handler, and a
                client-side navigation to it asks the router for a page that does not exist. That
                produced a failed request and a blank game. A full navigation is also the honest
                thing here — the game is a separate program, not another view of this one. */}
            <h2 className="text-lg font-medium">
              <a
                href={project.href}
                className="underline-offset-4 hover:underline focus-visible:underline"
              >
                {project.name}
              </a>
            </h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
          </div>

          {/* The description may carry a little markdown — a link, emphasis, code — so it is rendered
              rather than printed. Everything is escaped by construction; see components/rich-text. */}
          <RichText
            text={project.description}
            className="mt-3 max-w-xl text-zinc-600 first:mt-3 dark:text-zinc-400 sm:pl-8"
          />

          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400 sm:pl-8">
            <span>{project.stack.join(" · ")}</span>
            <span>{project.when}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
