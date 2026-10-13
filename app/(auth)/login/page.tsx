import { LoginForm } from "@/components/login-form";
import { McpDiscovery } from "@/components/mcp-discovery";
import { mcpDiscoveryUrl } from "@/lib/mcp-discovery";

/**
 * The sign-in page.
 *
 * A server component wrapping a client form, because the agent-facing discovery block has to be
 * in the HTML that is served rather than added after hydration. Splitting it this way keeps the
 * form client-side — it holds state — while the block that exists for machines is rendered on
 * the server, where a scraper will see it.
 */
/**
 * Escapes text for an HTML comment.
 *
 * The value is the deployment's own API URL, so this is defence rather than necessity: a
 * configuration value containing `-->` or a tag would otherwise break out of the comment. It
 * costs one line to not depend on that.
 */
function forComment(value: string): string {
  return value.replace(/[<>-]/g, "");
}

export default function LoginPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  return (
    <>
      {/* An HTML comment, emitted as a real comment node rather than a JSX comment — the latter
          is stripped at build time and would not reach page source. This is the cheapest form of
          discovery there is: a reader who views source finds where to look next, without having
          to parse anything. */}
      <div
        hidden
        dangerouslySetInnerHTML={{
          __html: `<!-- Agent-readable API and MCP description: ${forComment(mcpDiscoveryUrl(apiBaseUrl))} -->`,
        }}
      />
      <McpDiscovery apiBaseUrl={apiBaseUrl} />
      <LoginForm />
    </>
  );
}
