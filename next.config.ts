import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  /**
   * Next normally redirects `/foo/` to `/foo`, because it generates its own URLs without a trailing
   * slash. That is wrong for an uploaded game: a Godot export refers to its own assets relatively,
   * so at `/games/hexard` the browser asks for `/games/index.js` and gets a 404 — a blank page at a
   * URL that looks correct.
   *
   * With this off, a path is served at whichever form was requested, and `<Link>` keeps the href
   * exactly as written. `/games/hexard/` then resolves `index.js` to `/games/hexard/index.js`. The
   * games route redirects the slashless form itself, so both arrive at the URL that works.
   */
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ["50.47.163.122", "192.168.1.169", "couchcollective.software"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
