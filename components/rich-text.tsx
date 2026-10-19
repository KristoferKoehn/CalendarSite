import { parseParagraphs } from "@/lib/rich-text";

/**
 * Renders a project description, with the little markdown it may contain.
 *
 * A server component with no state, so the description is part of the HTML rather than something a
 * script has to build — which also means a card reads correctly with scripts blocked.
 *
 * The output is React elements, never HTML: the text is escaped by construction, so no description can
 * introduce markup. Links go through `safeHref` first, which is what stops a `javascript:` address
 * from becoming a working link.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = parseParagraphs(text);
  if (paragraphs.length === 0) return null;

  return (
    <>
      {paragraphs.map((inline, paragraphIndex) => (
        <p key={paragraphIndex} className={className ?? (paragraphIndex > 0 ? "mt-2" : undefined)}>
          {inline.map((node, nodeIndex) => {
            switch (node.kind) {
              case "link":
                return (
                  <a
                    key={nodeIndex}
                    href={node.href}
                    // An address on this site stays in the tab; one that leaves gets a new one, and
                    // no window.opener to talk back through.
                    {...(node.href.startsWith("/")
                      ? {}
                      : { target: "_blank", rel: "noreferrer noopener" })}
                    className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {node.text}
                  </a>
                );
              case "strong":
                return (
                  <strong key={nodeIndex} className="font-medium text-zinc-900 dark:text-zinc-100">
                    {node.text}
                  </strong>
                );
              case "code":
                return (
                  <code
                    key={nodeIndex}
                    className="rounded bg-zinc-100 px-1 py-0.5 text-[0.95em] dark:bg-zinc-800"
                  >
                    {node.text}
                  </code>
                );
              default:
                return <span key={nodeIndex}>{node.text}</span>;
            }
          })}
        </p>
      ))}
    </>
  );
}
