import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { PROJECTS, STATUS_LABEL } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Kristofer Koehn — projects",
  description: "Small, complete applications. Software for rooms, schedules and the people who use them.",
};

/**
 * The landing page.
 *
 * An index rather than a gallery: names on rules, type doing the work and no boxes. It is the
 * layout that ages best and the one that still reads as deliberate with one project or with ten —
 * which matters, because there is one project today.
 *
 * Nothing here is a client component. The only interactive element is the theme toggle, which
 * carries its own state, so the whole page renders on the server and the project list is in the
 * HTML for anything that does not run JavaScript.
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
        </div>
      </header>

      <main className="flex-1">
        <h1 className="mt-16 max-w-xl text-balance text-2xl font-medium leading-snug sm:mt-24 sm:text-3xl">
          Software for rooms, schedules and the people who use them.
        </h1>
        <p className="mt-5 max-w-xl text-zinc-600 dark:text-zinc-400">
          I build small, complete applications — one thing done properly rather than ten things
          sketched.
        </p>

        <section id="projects" className="mt-16 sm:mt-20">
          <div className="flex items-baseline justify-between border-b border-zinc-200 pb-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Selected projects</span>
            <span>2026</span>
          </div>

          {PROJECTS.length === 0 ? (
            <p className="mt-8 text-zinc-500 dark:text-zinc-400">Nothing published yet.</p>
          ) : (
            <ul>
              {PROJECTS.map((project) => (
                <li
                  key={project.name}
                  className="border-b border-zinc-200 py-9 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    {/* The name is the link, and it is the only link. A second "read more" would
                        be a second target for the same destination. */}
                    <h2 className="text-lg font-medium">
                      {project.href ? (
                        <Link
                          href={project.href}
                          className="underline-offset-4 hover:underline focus-visible:underline"
                        >
                          {project.name}
                        </Link>
                      ) : (
                        project.name
                      )}
                    </h2>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {STATUS_LABEL[project.status]}
                    </span>
                  </div>

                  <p className="mt-3 max-w-xl pl-0 text-zinc-600 dark:text-zinc-400 sm:pl-8">
                    {project.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400 sm:pl-8">
                    <span>{project.stack.join(" · ")}</span>
                    <span>{project.when}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
