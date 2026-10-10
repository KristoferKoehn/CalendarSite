import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildOpenApiDocument } from "../contract/openapi";

const outDir = join(process.cwd(), "contract", "out");

mkdirSync(outDir, { recursive: true });

const document = buildOpenApiDocument();
const target = join(outDir, "openapi.json");

writeFileSync(target, JSON.stringify(document, null, 2) + "\n");

console.log(`Wrote ${target}`);
