import type { Project, ProjectDraft, ProjectUpdateInput } from "@/contract";

/**
 * Moving between a stored project and the admin form.
 *
 * The form is the only place a project is edited, and it has to do two opposite things: start from
 * nothing when adding, and start from a project when changing one. Keeping that translation here means
 * it can be tested without a browser, and the component stays about layout and state.
 */

/** The fields the form owns. Everything else on a project is the server's business. */
export function toDraft(project: Project): ProjectDraft {
  return {
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    stack: project.stack.join(", "),
    when: project.when,
    // The delivery of an existing project is not editable: it decides whether an archive was unpacked,
    // and that has already happened. Changing it here would describe a file layout that does not exist.
    download: project.delivery === "download",
    href: project.href,
  };
}

/**
 * What to send when saving an existing project.
 *
 * The address is left out on purpose: it is where the project lives, and the build or archive is
 * already installed under it. Renaming it would move neither.
 */
export function toUpdate(draft: ProjectDraft): ProjectUpdateInput {
  return {
    name: draft.name,
    description: draft.description,
    status: draft.status,
    stack: splitList(draft.stack),
    when: draft.when,
    href: draft.href?.trim() || undefined,
  };
}

/**
 * The form holds the stack as one comma-separated field, because that is how somebody types a list.
 *
 * An empty entry is dropped rather than stored as an empty chip on the card, which is what an
 * accidental trailing comma would otherwise become.
 */
export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
