import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // A Godot WebAssembly export, served as static files from `public`. It is vendored compiler
    // output — the engine runtime and the audio worklets it ships with — not source anyone here
    // will edit. Linting it produces a hundred warnings about minified variables and eight errors
    // about `this` aliasing, all of which would have to be ignored individually to say what this
    // one line says: it is not ours to fix.
    "public/match3/**",
  ]),
]);

export default eslintConfig;
