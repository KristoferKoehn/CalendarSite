import { redirect } from "next/navigation";

/**
 * A tidy way in to the game.
 *
 * The export is static files under `public/match3`, not a route. Next.js does not serve a
 * directory's `index.html` for the bare path, so `/match3` would 404 and `/match3/` returns a 308
 * to somewhere that also does not resolve — neither of which is a URL worth putting on a portfolio.
 *
 * `redirect` rather than `permanentRedirect`: if the game is ever moved, rebuilt at a different
 * entry point, or replaced by a real route, a 307 lets an already-cached visitor be sent somewhere
 * new instead of having a 308 stuck in their browser.
 */
export default function Match3Entry() {
  redirect("/match3/index.html");
}
