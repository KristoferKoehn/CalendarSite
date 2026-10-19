import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { dataDir } from "@/lib/data-dir";
import { canDisplay, contentTypeFor, isFileName } from "@/lib/files";

/**
 * Serves a file from the shelf.
 *
 * Public on purpose: the point of uploading a file is to have a link that works for whoever it is
 * sent to. Writing is admin-only, in the backend.
 *
 * Whether the browser displays or downloads it is decided by type — see `canDisplay`. An uploaded
 * `.svg` or `.html` is served as an attachment, because a file that can execute would be a way onto
 * this origin, and these files live on the same origin as the session token.
 */

/** Where the shelf is. Resolved per request — see lib/data-dir.ts for why it is not a constant. */
const shelf = () => dataDir("files");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  // Decoded first: a name with a space arrives percent-encoded, and comparing the raw segment against
  // the rules would refuse names this service itself accepted.
  let decoded: string;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!isFileName(decoded)) return new Response("Not found", { status: 404 });

  const root = shelf();
  const target = path.resolve(root, decoded);
  // The name rules already forbid separators, so this cannot reach outside the directory. Checked
  // anyway: one comparison, against the alternative of arbitrary file disclosure if they are relaxed.
  if (!target.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });

  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) return new Response("Not found", { status: 404 });

  const inline = canDisplay(decoded);
  const disposition = inline
    ? `inline; filename="${decoded}"`
    : `attachment; filename="${decoded}"`;

  const stream = Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      "Content-Type": contentTypeFor(decoded),
      "Content-Length": String(info.size),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(decoded)}`,
      // Re-uploading under a new name is how a file changes, so a long cache here would pin people to
      // a version that no longer exists.
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
