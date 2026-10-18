import { describe, expect, it } from "vitest";
import {
  GAME_SHELL_STYLE,
  SERVICE_WORKER_SHIM,
  injectShell,
  isServiceWorker,
} from "@/lib/game-shell";

/**
 * How an uploaded export is presented, and how its service worker is neutered.
 *
 * Both exist because a Godot export ships its own opinions about the page it lives on. Serving them
 * untouched means every game inherits them, so these two adjustments are the site's, not the game's.
 */

const EXPORT = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hexard</title>
<style>body { background-color: black; } #canvas { display: block; }</style>
</head><body><canvas id="canvas"></canvas><script src="index.js"></script></body></html>`;

describe("injectShell", () => {
  it("adds the centering rules to the export", () => {
    const out = injectShell(EXPORT);
    expect(out).toContain("display: flex");
    expect(out).toContain("align-items: center");
    expect(out).toContain("justify-content: center");
  });

  it("puts them last in the head, so they win on cascade order", () => {
    const out = injectShell(EXPORT);
    const shell = out.indexOf("data-game-shell");
    const closing = out.indexOf("</head>");
    expect(shell).toBeGreaterThan(-1);
    // After the export's own style block, before the head closes.
    expect(shell).toBeGreaterThan(out.indexOf("#canvas { display: block; }"));
    expect(shell).toBeLessThan(closing);
  });

  it("keeps the document intact", () => {
    const out = injectShell(EXPORT);
    expect(out).toContain("<title>Hexard</title>");
    expect(out).toContain('<script src="index.js"></script>');
    expect(out).toContain('<canvas id="canvas"></canvas>');
    // The export's own rules must survive: they style the boot splash.
    expect(out).toContain("body { background-color: black; }");
  });

  it("is idempotent", () => {
    // It runs per request, so a document that already carries the block must not collect another.
    const once = injectShell(EXPORT);
    expect(injectShell(once)).toBe(once);
  });

  it("still works on a document with no head", () => {
    const out = injectShell("<html><body>game</body></html>");
    expect(out).toContain("data-game-shell");
    expect(out).toContain("<body>game</body>");
  });

  it("uses viewport units so a canvas larger than the window is scaled, not clipped", () => {
    expect(GAME_SHELL_STYLE).toContain("max-width: 100vw");
    expect(GAME_SHELL_STYLE).toContain("max-height: 100vh");
  });

  it("pins the boot splash to the viewport", () => {
    // Absolutely positioned inside a flex container, it would otherwise be laid out against the
    // canvas box and shrink with it.
    expect(GAME_SHELL_STYLE).toMatch(/#status[^{]*\{[^}]*position: fixed/);
  });
});

describe("isServiceWorker", () => {
  it("recognises the worker an export registers", () => {
    expect(isServiceWorker("index.service.worker.js")).toBe(true);
  });

  it("leaves the engine and console workers alone", () => {
    // These are real workers the engine needs; only the caching one is a problem.
    expect(isServiceWorker("index.worker.js")).toBe(false);
    expect(isServiceWorker("index.audio.worklet.js")).toBe(false);
    expect(isServiceWorker("index.js")).toBe(false);
    expect(isServiceWorker("index.wasm")).toBe(false);
  });
});

describe("the service worker shim", () => {
  it("unregisters itself", () => {
    expect(SERVICE_WORKER_SHIM).toContain("self.registration.unregister()");
  });

  it("deletes the caches the old worker filled", () => {
    // A stale cached document is the whole problem: it keeps serving a copy from before the route
    // was fixed, and nothing on the page can tell.
    expect(SERVICE_WORKER_SHIM).toContain("caches.keys()");
    expect(SERVICE_WORKER_SHIM).toContain("caches.delete(");
  });

  it("does not precache anything of its own", () => {
    expect(SERVICE_WORKER_SHIM).not.toContain("cache.addAll");
    expect(SERVICE_WORKER_SHIM).not.toContain("caches.open");
  });

  it("activates immediately rather than waiting", () => {
    expect(SERVICE_WORKER_SHIM).toContain("self.skipWaiting()");
  });
});
