/**
 * Names and types for the file shelf.
 *
 * The rules live here rather than in the route because the dashboard shows the same names and links,
 * and a server that accepts a name the interface cannot produce is a server with a rule nobody
 * follows.
 */

/** What a stored name may look like: no separators, no leading dot, ASCII only. */
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

/** Whether a name is one this service could have written, and will serve. */
export function isFileName(name: string): boolean {
  return FILE_NAME.test(name) && !name.includes("..");
}

/** The public address of a file. Absolute by default, because these exist to be pasted. */
export function fileHref(name: string, origin?: string): string {
  const path = `/files/${encodeURIComponent(name)}`;
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

/**
 * Types worth naming explicitly.
 *
 * Anything absent falls back to `application/octet-stream`, which a browser downloads rather than
 * guesses at — the safe default for a file whose extension nobody anticipated.
 */
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  woff2: "font/woff2",
};

/**
 * Types that may be shown in the browser rather than downloaded.
 *
 * Deliberately narrow. An uploaded file is trusted — an admin put it there — but these live on the
 * same origin as the calendar, so a file that can run script would be a way to reach the session
 * token. Raster images, PDFs and plain text cannot. SVG can, which is why it is not on the list.
 */
const INLINE = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "pdf", "txt", "md", "csv", "json"]);

/** The extension of a name, lower-cased and without the dot. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** The content type to serve a file as. */
export function contentTypeFor(name: string): string {
  return TYPES[extensionOf(name)] ?? "application/octet-stream";
}

/**
 * Whether this file may be displayed in place.
 *
 * Everything else is served as an attachment: `Content-Disposition` is the difference between a link
 * that opens a document and a link that runs whatever the document says.
 */
export function canDisplay(name: string): boolean {
  return INLINE.has(extensionOf(name));
}
