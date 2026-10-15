import { MCP_DOCS } from "@/lib/mcp-docs";
import { mcpDiscoveryPayload, mcpDiscoveryUrl } from "@/lib/mcp-discovery";

/**
 * Machine-readable API and MCP documentation, embedded in the sign-in page for agents to find.
 *
 * Four deliberate choices:
 *
 * **Server-rendered, not a client effect.** It is present in the HTML a scraper receives,
 * without JavaScript having run. An agent that does not execute scripts is the normal case.
 *
 * **Not `display: none`.** Several crawlers and text extractors skip hidden elements, which
 * would defeat the point. `sr-only` keeps it in the document's text and in the accessibility
 * tree while taking no space on screen — and it is honest about being for machines rather than
 * pretending to be a screen-reader aid.
 *
 * **A script block as well as prose.** `application/json` is not executed and is trivially
 * parsed, so an agent gets the schemas without reading a list of sentences.
 *
 * **A pointer comment.** HTML comments are invisible on the rendered page but present in the
 * source, so a reader who views source finds the description even if their tool did not parse
 * the other two.
 *
 * The payload is generated from the running server — see `scripts/generate-mcp-docs.mjs` — so
 * the schemas here are the ones the server actually publishes.
 */
export function McpDiscovery({ apiBaseUrl }: { apiBaseUrl: string }) {
  const payload = mcpDiscoveryPayload(apiBaseUrl);
  const publicTools = MCP_DOCS.tools.filter((t) => t.public).map((t) => t.name);

  return (
    <>
      {/* Rendered from a generated module constant and the build-time API URL. There is no
          user-controlled content in it, so there is nothing here to escape. */}
      <script
        type="application/json"
        id="mcp-discovery"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
      />
      <aside
        className="sr-only"
        data-mcp-discovery
        role="note"
        aria-label="API and MCP access for agents"
      >
        <h2>API and MCP access for agents</h2>
        <p>
          The REST API is published at <code>{payload.endpoints.rest}</code> and the MCP endpoint
          speaking JSON-RPC 2.0 at <code>{payload.endpoints.mcp}</code>. Those two are the whole
          surface. There is no second port and no alternative path: every route below hangs off the
          REST base, and MCP is reached only through the MCP address. Do not fall back to a bare
          port or to the site root, which serve the web app rather than the API.
        </p>
        <p>
          A machine-readable description is in the script element with id{" "}
          <code>mcp-discovery</code> on this page, and at{" "}
          <code>{mcpDiscoveryUrl(apiBaseUrl)}</code>. The document is at that origin&rsquo;s root
          rather than under the API path, which is where a client looks for it by convention.
        </p>
        <p>
          <code>initialize</code>, <code>ping</code> and <code>tools/list</code> need no
          credentials. <code>tools/call</code> needs a bearer token obtained from{" "}
          <code>auth.login</code>, except for {publicTools.join(" and ")}, which are public.
        </p>
        <ul>
          {MCP_DOCS.tools.map((tool) => (
            <li key={tool.name}>
              <code>{tool.name}</code>
              {tool.public ? " (public)" : " (requires a token)"} — {tool.description}
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
