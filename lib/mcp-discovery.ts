import { MCP_DOCS } from "@/lib/mcp-docs";

/**
 * The origin the site is served from, derived from the API base URL.
 *
 * They share an origin: the API lives under `/api` on the site's own hostname, which is the whole
 * point of that arrangement. So the site root is the API base with its path removed. Doing this
 * rather than adding another build-time variable means the two cannot be configured inconsistently.
 */
function siteOrigin(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  try {
    return new URL(base).origin;
  } catch {
    // Not an absolute URL — local development may pass a bare host. Best effort.
    return base.replace(/\/[^/]*$/, "");
  }
}

/**
 * The machine-readable description of the API and MCP surface.
 *
 * One function so the sign-in page and the well-known route cannot describe the tool set
 * differently. The tool list itself is generated from the running server; this adds the part
 * that depends on where the deployment lives, which is not known when the file is generated.
 */
export function mcpDiscoveryPayload(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/+$/, "");
  const publicTools = MCP_DOCS.tools.filter((t) => t.public).map((t) => t.name);

  return {
    ...MCP_DOCS,
    endpoints: {
      // The one address an agent should use for each surface. Every other path that happens to
      // reach the same backend — the old bare port, or the site root — is an accident of the
      // proxy configuration rather than a published endpoint, and is deliberately not listed.
      mcp: `${base}/mcp`,
      rest: base,
      health: `${base}/healthz`,
      // The discovery document itself. It cannot move under the API path: a `.well-known`
      // document is required to be at the root of an origin for clients to find it by
      // convention, and the site's own route serves it there.
      discovery: mcpDiscoveryUrl(apiBaseUrl),
    },
    authentication: {
      scheme: "bearer",
      header: "Authorization: Bearer <token>",
      obtain: "tools/call auth.login, or POST /auth/login",
      publicTools,
    },
    errors:
      "JSON-RPC error object; data.code carries the API error code " +
      "(INVALID_INPUT, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL). " +
      'tools/call results are wrapped as { content: [{ type: "text", text: "<json>" }] }.',
  };
}

/**
 * The absolute URL agents should fetch for this description.
 *
 * Built from the site origin, not the API base. It was previously `${apiBaseUrl}/.well-known/
 * mcp.json`, which was correct only while the API base was the bare origin; once the API moved
 * under `/api` the same expression produced `/api/.well-known/mcp.json`, which nothing serves.
 */
export function mcpDiscoveryUrl(apiBaseUrl: string) {
  return `${siteOrigin(apiBaseUrl)}/.well-known/mcp.json`;
}
