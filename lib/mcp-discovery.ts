import { MCP_DOCS } from "@/lib/mcp-docs";

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
      mcp: `${base}/mcp`,
      rest: base,
      health: `${base}/healthz`,
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

/** The absolute URL agents should fetch for this description. */
export function mcpDiscoveryUrl(apiBaseUrl: string) {
  return `${apiBaseUrl.replace(/\/+$/, "")}/.well-known/mcp.json`;
}
