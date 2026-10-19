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

/**
 * What following a card does.
 *
 * `play` unpacks the upload and serves it; `download` hands the file over unchanged. A document
 * written before this existed has no field at all, and `""` is what the backend sends for those, so
 * both read as `play`.
 */
export const projectDeliverySchema = z.enum(["play", "download"]);
export type ProjectDelivery = z.infer<typeof projectDeliverySchema>

/**
 * What a project's card does, with the older forms folded in.
 *
 * Kept as a plain validator rather than a transform: the API client is generic over the schema's
 * output type, and a transform makes the parsed type differ from the declared one, which it cannot
 * express. Normalising at the point of use costs one function and keeps every other type honest.
 */
export function projectDelivery(project: { delivery?: ProjectDelivery | "" }): ProjectDelivery {
  return project.delivery === "download" ? "download" : "play";
}

export const projectSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  status: projectStatusSchema,
  stack: z.array(z.string()),
  when: z.string(),
  /** Empty on documents written before this existed, and on projects with no upload. */
  delivery: z.union([projectDeliverySchema, z.literal("")]).optional(),
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
  /**
   * Whether the upload is unpacked and played, or handed over as a file.
   *
   * A checkbox on the form, so it has to survive being unticked: `false` is a real answer and must
   * not be read as "not given".
   */
  download: z.boolean(),
  href: z
    .string()
    .trim()
    .max(300, "The address is too long")
    // An empty string means "not given", and the form's initial value is empty. Written as a
    // refinement rather than `.regex(...).optional()`, because `.optional()` only forgives
    // `undefined` — `""` would still have to satisfy the pattern, so leaving the field blank could
    // never pass no matter how optional it was declared to be.
    .refine((value) => value === "" || /^\/(?!\/)/.test(value), "Start with a single slash")
    .refine((value) => !value.includes(".."), "The address cannot contain '..'")
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
  delivery: ProjectDelivery;
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

/**
 * One file on the shelf.
 *
 * There is no metadata behind these: the directory is the list, so name, size and time are read from
 * the filesystem and cannot disagree with what is actually stored.
 */
export const fileSchema = z.object({
  name: z.string(),
  size: z.number(),
  modifiedAt: isoTimestampSchema,
});
export type StoredFile = z.infer<typeof fileSchema>;

export const fileListSchema = z.object({ files: z.array(fileSchema) });
export type FileList = z.infer<typeof fileListSchema>;

export const fileResponseSchema = z.object({ file: fileSchema });
export type FileResponse = z.infer<typeof fileResponseSchema>;

/**
 * An archive a project hands over, seen as a file in its own right.
 *
 * It exists because a download is both: created by a project, and a thing with an address, a size and a
 * link somebody may have pasted somewhere. `projectSlug` is empty for an archive no project points at.
 */
export const downloadSchema = z.object({
  slug: z.string(),
  size: z.number(),
  modifiedAt: isoTimestampSchema,
  href: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
});
export type Download = z.infer<typeof downloadSchema>;

export const downloadListSchema = z.object({ downloads: z.array(downloadSchema) });
export type DownloadList = z.infer<typeof downloadListSchema>;

export const downloadResponseSchema = z.object({ download: downloadSchema });
export type DownloadResponse = z.infer<typeof downloadResponseSchema>;
