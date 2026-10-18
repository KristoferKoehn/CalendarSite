import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { archiveSlug } from "@/lib/archives";

/**
 * Hands over an uploaded archive.
 *
 * A project whose upload was kept intact instead of unpacked points its card here, and following it
 * downloads the file. The download is the point, so the response says so: `Content-Disposition:
 * attachment` makes the browser save it rather than trying to display it, which it would otherwise
 * be entitled to attempt.
 *
 * Read from the archives directory rather than the builds one, because the two are deliberately
 * separate: a slug can have a build, an archive, or both, and neither directory can be enumerated
 * over HTTP.
 */

/** Where kept uploads live. The backend writes here; this only reads. */
const ARCHIVES_DIR = process.env.ARCHIVES_DIR ?? path.join("C:\\sites", "archives");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const slug = archiveSlug(file);
  if (!slug) return new Response("Not found", { status: 404 });

  const root = path.resolve(ARCHIVES_DIR);
  const target = path.resolve(root, `${slug}.zip`);
  // The slug pattern already forbids separators and dots, so this cannot reach outside the directory.
  // Checked anyway: the cost is one comparison, and the alternative if the pattern is ever relaxed is
  // arbitrary file disclosure.
  if (!target.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });

  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) return new Response("Not found", { status: 404 });

  const stream = Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(info.size),
      // The filename comes from the address, which is the only name this service knows. A quoted
      // filename and a second unquoted one for clients that cannot parse the quoted form.
      "Content-Disposition": `attachment; filename="${slug}.zip"; filename*=UTF-8''${encodeURIComponent(slug)}.zip`,
      // Never cached: replacing an archive must take effect on the next visit, and a stale download
      // is worse than no download because it looks like the real thing.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
