import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Serves exported games from disk, at request time.
 *
 * Next does not serve `public/` files added after the build — only what was there when it built —
 * so an upload dropped into `public/` is invisible until the next deploy. This route reads from a
 * directory outside the repository instead, which means a game can be added, replaced or deleted
 * while the server is running.
 *
 * A route handler rather than a Caddy file_server block for one practical reason: it needs no change
 * to the server's configuration. Everything here ships through the existing deploy, so the whole
 * feature is ordinary code.
 *
 * Same origin on purpose. The games are meant to call the backend as the signed-in user, which they
 * cannot do from a separate origin without its own token handling. The cost is that an export's
 * JavaScript runs with access to this origin's `localStorage` — including the session token — so an
 * export is trusted code. That is a deliberate trade, not an oversight.
 */

/**
 * Where the exports live. Outside the repository, because this writes at runtime and a checkout is
 * not a data store — and because a `git pull` deploy would not deliver files that were never
 * committed.
 */
const GAMES_DIR = process.env.GAMES_DIR ?? "C:\\sites\\games";

/** The types a Godot web export actually contains. */
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".pck": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".css": "text/css; charset=utf-8",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};

/**
 * Resolve a request path inside the games directory, or refuse.
 *
 * Two things matter here. A path escape — `../` or an absolute path smuggled through the segments —
 * must not reach anything outside the root. And a directory should serve its `index.html`, because
 * a link to `/games/foo` is what a project card would carry, not `/games/foo/index.html`.
 */
async function resolveAsset(segments: string[]): Promise<{ file: string; isDirectory: boolean } | null> {
  const root = path.resolve(GAMES_DIR);
  const joined = path.resolve(root, ...segments);

  // `startsWith(root + sep)` and not `startsWith(root)`, or a sibling named `games-other` would pass.
  if (joined !== root && !joined.startsWith(root + path.sep)) return null;

  try {
    const info = await stat(joined);
    if (info.isDirectory()) {
      const index = path.join(joined, "index.html");
      const indexInfo = await stat(index).catch(() => null);
      if (!indexInfo?.isFile()) return null;
      return { file: index, isDirectory: true };
    }
    return info.isFile() ? { file: joined, isDirectory: false } : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ asset?: string[] }> },
) {
  const { asset = [] } = await params;
  const resolved = await resolveAsset(asset);
  if (!resolved) return new Response("Not found", { status: 404 });

  // A directory has to be served at a URL ending in a slash.
  //
  // The export refers to its own assets relatively — `<script src="index.js">` — so the browser
  // resolves them against the current directory. At `/games/hexard` that is `/games/`, one level too
  // high, and every asset 404s: the page loads, the canvas is there, and the game never starts.
  //
  // Next used to normalise this away by redirecting `/games/hexard/` to `/games/hexard`, which is
  // precisely backwards for this route; `skipTrailingSlashRedirect` turns that off, so the slashless
  // form is redirected here instead. Both arrive at the form that works.
  if (resolved.isDirectory && !new URL(request.url).pathname.endsWith("/")) {
    const url = new URL(request.url);
    // A relative Location rather than an absolute one. Behind the reverse proxy this request
    // arrives as plain http on loopback, so an absolute redirect built from `request.url` would
    // carry the wrong scheme and host — a correct destination and a pointless extra hop.
    return new Response(null, {
      status: 308,
      headers: { Location: `${url.pathname}/${url.search}` },
    });
  }

  const extension = path.extname(resolved.file).toLowerCase();
  const type = TYPES[extension] ?? "application/octet-stream";
  const size = (await stat(resolved.file)).size;

  // Streamed rather than read into memory: an export's engine is tens of megabytes, and buffering it
  // per request is memory a small server does not have to spare.
  const stream = Readable.toWeb(createReadStream(resolved.file)) as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      // The engine and game data never change once uploaded under a given slug, so they can be
      // cached hard. The entry document cannot, because replacing a game must take effect.
      "Cache-Control": path.basename(resolved.file) === "index.html"
        ? "no-cache"
        : "public, max-age=31536000, immutable",
      // Godot's web export is same-origin and needs no cross-origin isolation, but these are cheap
      // and let a threaded build work if one is ever uploaded.
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
