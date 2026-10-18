/**
 * The names of stored downloads.
 *
 * A download is addressed by the slug it was published under, so the address is the only thing the
 * serving side has to understand. Deriving it in one place keeps the rule that writes the file and
 * the rule that serves it from drifting apart — a guard that accepts a name the writer would never
 * produce is a guard that does nothing.
 */

/** The slug rules the backend writes with, plus the extension. */
const ARCHIVE_FILE = /^([a-z0-9][a-z0-9-]{0,59})\.zip$/;

/**
 * The slug a download address refers to, or null if it is not one.
 *
 * Deliberately strict: no leading dot, no separators, no percent-escapes, no upper case. Anything this
 * rejects is a 404 rather than an attempt to interpret it, and the alternative — joining an
 * unvalidated segment onto a directory — is how a file server becomes a file browser.
 */
export function archiveSlug(file: string): string | null {
  const match = ARCHIVE_FILE.exec(file);
  return match ? match[1] : null;
}

/** The address a download is served at, given the slug it was published under. */
export function archiveHref(slug: string): string {
  return `/downloads/${slug}.zip`;
}
