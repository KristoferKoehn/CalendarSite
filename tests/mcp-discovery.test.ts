import { describe, expect, it } from "vitest";
import { mcpDiscoveryPayload, mcpDiscoveryUrl } from "@/lib/mcp-discovery";

/**
 * The deployment publishes the API under `/api` on the site's own origin. These tests pin the
 * addresses the agent-facing description hands out, because getting one wrong sends an agent to a
 * path that does not exist — which is exactly what happened when the API moved under `/api` and
 * the discovery URL was still built by appending to the API base, producing
 * `/api/.well-known/mcp.json` and a 404.
 */

const DEPLOYED = "https://couchcollective.software/api";
const BARE = "https://couchcollective.software";

describe("mcpDiscoveryUrl", () => {
  it("puts the document at the site root, not under the API path", () => {
    // The bug this exists for.
    expect(mcpDiscoveryUrl(DEPLOYED)).toBe(`${BARE}/.well-known/mcp.json`);
    expect(mcpDiscoveryUrl(DEPLOYED)).not.toContain("/api/.well-known");
  });

  it("is unchanged when the API base is the bare origin", () => {
    expect(mcpDiscoveryUrl(BARE)).toBe(`${BARE}/.well-known/mcp.json`);
  });

  it("tolerates a trailing slash", () => {
    expect(mcpDiscoveryUrl(`${DEPLOYED}/`)).toBe(`${BARE}/.well-known/mcp.json`);
  });

  it("works for a local development base with a port", () => {
    expect(mcpDiscoveryUrl("http://127.0.0.1:4001")).toBe("http://127.0.0.1:4001/.well-known/mcp.json");
  });
});

describe("mcpDiscoveryPayload endpoints", () => {
  const payload = mcpDiscoveryPayload(DEPLOYED);

  it("names one address for each surface, under the API base", () => {
    expect(payload.endpoints.rest).toBe(DEPLOYED);
    expect(payload.endpoints.mcp).toBe(`${DEPLOYED}/mcp`);
    expect(payload.endpoints.health).toBe(`${DEPLOYED}/healthz`);
  });

  it("names no bare port anywhere an agent would follow", () => {
    // A bare port is the arrangement that fails on a network permitting only 80 and 443, and it
    // must not be advertised once the API is published under the site's own hostname.
    const json = JSON.stringify(payload);
    expect(json).not.toContain(":4000");
    expect(json).not.toContain(":4001");
  });

  it("reports the discovery document under the same origin", () => {
    expect(payload.endpoints.discovery).toBe(`${BARE}/.well-known/mcp.json`);
  });

  it("keeps the generated protocol and tool list", () => {
    expect(payload.protocolVersion).toBe("2024-11-05");
    expect(payload.transport.path).toBe("/mcp");
    expect(payload.tools.length).toBeGreaterThan(0);
  });
});
