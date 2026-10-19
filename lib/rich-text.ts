/**
 * A small amount of markdown for project descriptions.
 *
 * Enough to link and to emphasise, and nothing else. A description is one or two sentences on a card,
 * so a full markdown implementation would be a dependency, a bundle cost and a much larger surface for
 * a need this size.
 *
 * Everything is parsed by hand rather than rendered as HTML, which is the part that matters: a
 * description is text an admin typed, and turning it into markup means deciding what may become a
 * link. `safeHref` is that decision, and it is deliberately narrow.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "strong"; text: string }
  | { kind: "code"; text: string };

/**
 * The address a link is allowed to point at, or null if it is not one.
 *
 * Two shapes only: a path on this site, and an absolute http(s) URL. Everything else is refused —
 * `javascript:` and `data:` because a description would become a way to run script, and anything
 * relative without a leading slash because a card is read from more than one address.
 *
 * A refused address does not become a broken link: the label is kept as plain text, so the reader sees
 * the words and the writer sees that something was not understood.
 */
export function safeHref(target: string): string | null {
  const value = target.trim();
  if (value === "") return null;

  // A single leading slash, not two: `//host` is an absolute URL wearing a path's clothes.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value.includes("..") ? null : value;
  }
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  return null;
}

const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/;
const STRONG = /^\*\*([^*]+)\*\*/;
const CODE = /^`([^`]+)`/;

/**
 * Parse the inline parts of one paragraph.
 *
 * Scanned left to right and matched at the cursor rather than by splitting on delimiters, because a
 * split cannot tell an opening `**` from a closing one and would mangle a sentence with a single
 * asterisk in it.
 */
export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  let index = 0;

  const flush = () => {
    if (text) {
      out.push({ kind: "text", text });
      text = "";
    }
  };

  while (index < source.length) {
    const rest = source.slice(index);

    const link = LINK.exec(rest);
    if (link) {
      const [, label, target] = link;
      const href = safeHref(target);
      flush();
      // An address that is not allowed keeps the words and loses the link. The markup is left visible
      // rather than silently reduced to its label, so a writer can see that it was not understood
      // instead of wondering why their link is not a link.
      out.push(href ? { kind: "link", text: label, href } : { kind: "text", text: link[0] });
      index += link[0].length;
      continue;
    }

    const bold = STRONG.exec(rest);
    if (bold) {
      flush();
      out.push({ kind: "strong", text: bold[1] });
      index += bold[0].length;
      continue;
    }

    const code = CODE.exec(rest);
    if (code) {
      flush();
      out.push({ kind: "code", text: code[1] });
      index += code[0].length;
      continue;
    }

    text += source[index];
    index += 1;
  }

  flush();
  return out;
}

/**
 * A description split into paragraphs.
 *
 * A blank line starts a new one, as it would in markdown. A single newline does not: wrapping a long
 * line while typing should not decide where a paragraph breaks.
 */
export function parseParagraphs(source: string): Inline[][] {
  return source
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter((paragraph) => paragraph !== "")
    .map(parseInline);
}

/**
 * Whether a description uses any of this, so the admin form can show an example only when it helps.
 */
export function hasMarkup(source: string): boolean {
  return /\[[^\]]+\]\(|\*\*[^*]+\*\*|`[^`]+`/.test(source);
}
