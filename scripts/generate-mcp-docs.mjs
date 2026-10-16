// Generate the embedded MCP documentation from the live server, so the schemas in the
// repository are the ones the server actually publishes rather than a transcription that can
// drift.
//
// Run: node scripts/generate-mcp-docs.mjs
//      MCP_BASE=http://127.0.0.1:4001 node scripts/generate-mcp-docs.mjs
//
// The default is the deployed API, which is served under /api on the site's own origin. It used to
// be the bare :4000 port, which stopped existing when the API moved behind the proxy — and a
// hardcoded address that no longer resolves is a script that fails for a reason unrelated to what
// it is for.
const BASE = (process.env.MCP_BASE || "https://couchcollective.software/api").replace(/\/+$/, "");
const OUT = "lib/mcp-docs.ts";

async function rpc(method, params, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const r = await fetch(BASE + "/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return r.json();
}

(async () => {
  const init = await rpc("initialize", { protocolVersion: "2024-11-05" });
  const info = init?.result?.serverInfo ?? {};
  const protocolVersion = init?.result?.protocolVersion ?? "";

  const list = await rpc("tools/list", {});
  const tools = list?.result?.tools ?? [];
  if (tools.length === 0) {
    console.error("no tools returned; refusing to write an empty file");
    process.exit(1);
  }

  // Refuse if the server does not publish the flag.
  //
  // Defaulting to "needs a token" would be safe but silent: the generated file would be wrong about
  // every public tool, and nothing downstream could tell the difference between "this server says
  // the tool is protected" and "this server does not say". An older backend is a reason to stop,
  // not to guess.
  const missing = tools.filter((t) => typeof t.public !== "boolean").map((t) => t.name);
  if (missing.length > 0) {
    console.error(
      `the server did not publish a public flag for ${missing.length} tool(s): ${missing.join(", ")}\n` +
        "It is an older build. Nothing written — regenerate against a server that publishes it.",
    );
    process.exit(1);
  }

  const payload = {
    protocolVersion,
    server: { name: info.name ?? "CalendarBackend", version: info.version ?? "" },
    transport: {
      method: "POST",
      path: "/mcp",
      contentType: "application/json",
      note: "One JSON-RPC 2.0 request per HTTP request. No session, no streaming, no batch.",
    },
    methods: {
      initialize: { auth: false, description: "Handshake. Returns the protocol version and capabilities." },
      "tools/list": { auth: false, description: "Enumerate the tools below. Readable without a token." },
      "tools/call": { auth: true, description: "Invoke one tool. Requires a bearer token, except for the two public tools." },
      ping: { auth: false, description: "Liveness. Returns an empty result." },
    },
    errorShape: {
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32000, message: "Missing token", data: { code: "UNAUTHENTICATED" } },
    },
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      // Read from the server rather than inferred from the tool's name.
      //
      // It used to be `t.name === "auth.register" || t.name === "auth.login"`, which duplicated a
      // fact the server already held. Adding a public tool on the backend would have left this file
      // silently claiming it needed a token, and no test compared the two.
      //
      // `?? false` because an older server does not publish the field; the check above refuses to
      // continue in that case, so this is only a type guard.
      public: t.public ?? false,
    })),
  };

  const file = `/**
 * The MCP surface, as the server publishes it.
 *
 * GENERATED — do not edit by hand. Run \`node scripts/generate-mcp-docs.mjs\` from the
 * CalendarSite directory after changing a tool on the backend, or the two will disagree.
 *
 * It is embedded in the sign-in page so an agent landing on the site can discover the API
 * without credentials, which is the same reason \`tools/list\` is public: the alternative is
 * an agent guessing at tool names and argument shapes.
 */

export const MCP_DOCS = ${JSON.stringify(payload, null, 2)} as const;
`;

  const fs = await import("node:fs/promises");
  await fs.writeFile(OUT, file, "utf8");
  console.log(`wrote ${OUT}: ${tools.length} tools, protocol ${protocolVersion}`);
  for (const t of payload.tools) {
    console.log(`  ${t.public ? "public " : "auth   "}${t.name}`);
  }
})();
