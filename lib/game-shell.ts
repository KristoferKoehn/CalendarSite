/**
 * Presentation and cache hygiene for uploaded game exports.
 *
 * A Godot web export is a complete little page: its own `index.html`, its own CSS, and — since 4.x —
 * a service worker. Serving those files untouched means the site inherits all three of its opinions,
 * and two of them are wrong for a game hosted on someone else's domain.
 */

/**
 * Centering, applied to every uploaded game.
 *
 * The export positions its canvas with `#canvas { display: block }` and nothing else, so the game
 * sits in the top-left corner of the window with the rest of the page empty beside it. That is a
 * choice that makes sense for a page that *is* the game and less sense for one served under a
 * portfolio, where the window is not the game's own size.
 *
 * The size the game draws at is game data — `canvasResizePolicy` and the project's viewport settings
 * decide that, and this does not touch it. This only places the result: a viewport-height flex
 * container centred on both axes, with `max-*` so a canvas larger than the window is scaled down
 * rather than clipped.
 *
 * The status overlay is pinned to the viewport instead of the body, because an absolutely positioned
 * element inside a flex container would otherwise be laid out relative to the canvas box and the
 * boot splash would shrink with it.
 */
export const GAME_SHELL_STYLE = `
html, body { height: 100%; }
body {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0b0d10;
}
#canvas {
  max-width: 100vw;
  max-height: 100vh;
  margin: auto;
}
#status, #status-splash { position: fixed; inset: 0; }
`;

/**
 * A service worker that removes itself.
 *
 * The exported worker is a PWA offline cache: it precaches the entry document, the engine and the
 * game data, and answers navigations from that cache. On a page that gets replaced by an upload, that
 * is a trap — a visitor who loaded a game while it was half-installed keeps that copy forever, with
 * no way to tell why one machine works and another does not. It also means replacing a game under the
 * same address is invisible to anyone who has already visited it.
 *
 * Offline support is worth nothing here: the game is fetched from this server or not at all. So the
 * registration is accepted and then undone, and the caches it filled are deleted. A game that never
 * installs a cache cannot serve a stale one.
 */
export const SERVICE_WORKER_SHIM = `// Served in place of the export's own service worker. See lib/game-shell.ts.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop everything a previous version cached. Its copies may predate fixes to how this route
      // serves headers, and a cached document keeps that broken state for good.
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      // A page that loaded through the old worker is running against a cache that no longer
      // exists; reloading it once puts it on the network path.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url).catch(() => {});
    })(),
  );
});
`;

/** The files whose name marks them as the export's service worker. */
export function isServiceWorker(fileName: string): boolean {
  return /service\.worker\.js$/.test(fileName);
}

/**
 * Add the shell styles to an export's entry document.
 *
 * Injected rather than replacing the document, because the export's own styling and boot splash are
 * what make it look finished while the engine downloads. The block is placed immediately before
 * `</head>` so it wins on cascade order without needing `!important` everywhere; a document without a
 * head gets it at the front, which is still valid and still later than nothing.
 *
 * Idempotent, because this runs per request and a document that already carries the block must not
 * collect a second copy.
 */
export function injectShell(html: string): string {
  if (html.includes(GAME_SHELL_STYLE.trim().slice(0, 40))) return html;
  const block = `<style data-game-shell>${GAME_SHELL_STYLE}</style>`;
  const head = html.indexOf("</head>");
  if (head !== -1) return `${html.slice(0, head)}${block}${html.slice(head)}`;
  return block + html;
}
