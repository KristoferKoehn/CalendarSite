import { describe, expect, it } from "vitest";
import { MCP_DOCS } from "@/lib/mcp-docs";
import { mcpDiscoveryPayload, mcpDiscoveryUrl } from "@/lib/mcp-discovery";

const BASE = "https://api.example.test";

describe("mcpDiscoveryPayload", () => {
  const payload = mcpDiscoveryPayload(BASE);

  it("carries absolute endpoint URLs, since a relative one is useless to a scraper", () => {
    expect(payload.endpoints.mcp).toBe(`${BASE}/mcp`);
    expect(payload.endpoints.base).toBe(BASE);
    expect(payload.endpoints.health).toBe(`${BASE}/healthz`);
  });

  it("tolerates a trailing slash on the configured base", () => {
    // The value comes from deployment configuration, where a trailing slash is easy to add and
    // would otherwise produce a doubled slash in every URL.
    const withSlash = mcpDiscoveryPayload(`${BASE}/`);
    expect(withSlash.endpoints.mcp).toBe(`${BASE}/mcp`);
    expect(withSlash.endpoints.base).toBe(BASE);
  });

  it("names the two public tools and nothing else", () => {
    expect(payload.authentication.publicTools).toEqual(["auth.register", "auth.login"]);
  });

  it("says how to authenticate and what an error looks like", () => {
    // The two things an agent cannot guess from a tool list.
    expect(payload.authentication.header).toContain("Bearer");
    expect(payload.errors).toContain("UNAUTHENTICATED");
    expect(payload.errors).toContain("content");
  });

  it("publishes every tool with a schema", () => {
    expect(payload.tools.length).toBeGreaterThan(0);
    for (const tool of payload.tools) {
      expect(tool.name).toMatch(/^[a-z]+\.[a-z]+$/);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("marks exactly the public tools as public", () => {
    for (const tool of payload.tools) {
      const shouldBePublic = tool.name === "auth.register" || tool.name === "auth.login";
      expect(tool.public).toBe(shouldBePublic);
    }
  });
});

describe("mcpDiscoveryUrl", () => {
  it("points at the well-known route", () => {
    expect(mcpDiscoveryUrl(BASE)).toBe(`${BASE}/.well-known/mcp.json`);
    expect(mcpDiscoveryUrl(`${BASE}/`)).toBe(`${BASE}/.well-known/mcp.json`);
  });
});

/**
 * The embedded description is generated from the server, so it can fall out of step with it.
 *
 * This asks the live server what it publishes and compares. It skips rather than fails when the
 * backend cannot be reached, because a build machine without network access should not fail on
 * that — the point is to catch drift when it is visible, not to require connectivity.
 *
 * Set MCP_TEST_BASE to point at something other than the deployed instance.
 */
describe("embedded docs against the live server", () => {
  const reachableBase = process.env.MCP_TEST_BASE ?? "https://couchcollective.software:4000";

  it("lists the same tools the server publishes, with the same schemas", async () => {
    let live: { tools?: { name: string; description: string; inputSchema: unknown }[] };
    try {
      const response = await fetch(`${reachableBase}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
        signal: AbortSignal.timeout(8000),
      });
      live = (await response.json()).result;
    } catch {
      console.warn(`  skipped: ${reachableBase} is not reachable from here`);
      return;
    }

    const liveTools = (live.tools ?? [])
      .map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (liveTools.length === 0) {
      console.warn("  skipped: the server returned no tools");
      return;
    }

    const embedded = MCP_DOCS.tools
      .map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // A deep comparison, so a renamed argument or a newly required field is caught rather than
    // only a renamed tool. Run `node scripts/generate-mcp-docs.mjs` to regenerate.
    expect(embedded).toEqual(liveTools);
  });
});
