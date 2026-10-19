import path from "node:path";

/**
 * Where the data directories live.
 *
 * These hold files written at runtime — game builds, kept uploads, download archives — and are served
 * by route handlers that read them from disk.
 *
 * ## Why the fallback is computed rather than written out
 *
 * A literal path here breaks the production build, and does it only once the directory has something
 * in it. Turbopack follows a filesystem read whose path it can determine statically, and treats what it
 * finds as build inputs:
 *
 *   FATAL: [project]/app/files/[name]/route.ts
 *   Path C:/sites/files/hexard-win.zip could not be resolved because a component does not exist
 *
 * With the directory empty there is nothing to trace and the build passes; the moment a file is
 * uploaded it tries to resolve that file as a module, and fails. So the failure appears exactly when
 * the feature starts being used, which is the worst time for a deploy to stop working.
 *
 * Deriving the root from the running process keeps the value out of the bundler's reach while still
 * pointing at the same place: on this deployment the app runs from a directory on `C:`, so the root is
 * `C:\` and the directories are `C:\sites\...`. Setting the environment variable is still the
 * supported way to move them, and is read first.
 */

export type DataDir = "files" | "games" | "archives";

const ENV_NAMES: Record<DataDir, string> = {
  files: "FILES_DIR",
  games: "GAMES_DIR",
  archives: "ARCHIVES_DIR",
};

/**
 * The absolute path of a data directory.
 *
 * Called per request rather than once at module load, so the value is never available while the bundle
 * is being built — which is the whole point of it.
 */
export function dataDir(name: DataDir): string {
  const configured = process.env[ENV_NAMES[name]];
  if (configured) return path.resolve(configured);

  // The root of the volume this app is deployed on, rather than a written-out drive letter.
  const root = path.parse(process.cwd()).root;
  return path.join(root, "sites", name);
}
