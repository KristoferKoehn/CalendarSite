import { mcpDiscoveryPayload } from "@/lib/mcp-discovery";

/**
 * Standard discovery location for the API and MCP surface.
 *
 * A `.well-known` route rather than a static file, because the endpoint URLs are deployment
 * configuration: a static file would need the address baked in at generation time and would be
 * wrong on the next machine. Reading it per request costs nothing that matters and cannot drift.
 *
 * Public and unauthenticated, which is the point. The tool list it returns is the same one
 * `tools/list` publishes without a token, so this reveals nothing a caller could not already
 * ask for — it just removes the need to know where to ask.
 *
 * No `export const dynamic` here: this project runs with `cacheComponents`, where the route
 * segment config is rejected. Reading the environment variable is enough to keep it off the
 * prerender path.
 */
export function GET() {
  const payload = mcpDiscoveryPayload(process.env.NEXT_PUBLIC_API_URL ?? "");
  return Response.json(payload, {
    headers: {
      // Readable by anything, including a page on another origin.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
