import { z } from "zod";
import { isoTimestampSchema } from "./common";

/**
 * A portfolio project, as the backend stores it.
 *
 * The same shape is written to one JSON document per project, so this schema is also the file
 * format. A field added here needs to be added to the store's struct, or the two disagree about what
 * a project is.
 */

export const projectStatusSchema = z.enum(["live", "soon", "archived"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  status: projectStatusSchema,
  stack: z.array(z.string()),
  when: z.string(),
  /** Where the card links. A path on this site, never an absolute URL. */
  href: z.string(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type Project = z.infer<typeof projectSchema>;

export const projectListSchema = z.object({
  projects: z.array(projectSchema),
});
export type ProjectList = z.infer<typeof projectListSchema>;

export const projectResponseSchema = z.object({
  project: projectSchema,
});
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

/** The statuses, with the label the card shows. Kept beside the schema so they cannot drift. */
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  live: "live",
  soon: "soon",
  archived: "archived",
};

/** The editable part of a project, for the admin form. */
export const projectDraftSchema = z.object({
  name: z.string().trim().min(1, "A title is required").max(120, "The title is too long"),
  slug: z
    .string()
    .trim()
    .max(60, "The address is too long")
    .regex(/^[a-z0-9-]*$/, "Lower-case letters, digits and hyphens only")
    // Empty means "derive it from the title", which the form offers rather than requiring.
    .optional(),
  description: z.string().trim().min(1, "A description is required").max(2000, "The description is too long"),
  status: projectStatusSchema,
  stack: z.string().trim().max(400, "The stack list is too long"),
  when: z.string().trim().max(40, "The date is too long"),
  href: z
    .string()
    .trim()
    .max(300, "The address is too long")
    // A leading slash and not a protocol-relative one: a card links within this site.
    .regex(/^\/(?!\/)/, "Start with a single slash")
    .refine((v) => !v.includes(".."), "The address cannot contain '..'")
    .optional(),
});
export type ProjectDraft = z.infer<typeof projectDraftSchema>;

/**
 * What the form sends to create a project.
 *
 * Not derived from the draft schema: the draft is what the form validates, and this is what goes on
 * the wire — the stack has already been split from its comma-separated field, and `game` is a File
 * that no schema can describe.
 */
export interface ProjectCreateInput {
  name: string;
  slug?: string;
  description: string;
  status: ProjectStatus;
  stack: string[];
  when: string;
  href?: string;
  /** The zip of the export, when one was chosen. */
  game?: File;
}

/** The editable part of a project. Omitted fields are left alone. */
export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  stack?: string[];
  when?: string;
  href?: string;
}
