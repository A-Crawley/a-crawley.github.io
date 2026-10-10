/**
 * Dev log entries are Markdown files with a small header. This reads them without a Markdown
 * library: entries use only paragraphs, bullet lists, **bold** and `code`, and nothing here ever
 * produces HTML, so an entry can't inject markup.
 */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  code?: boolean;
}

export type Block =
  { type: "paragraph"; spans: InlineSpan[] } | { type: "list"; items: InlineSpan[][] };

export interface DevLogEntry {
  /** From the file name, so it is stable. */
  id: string;
  title: string;
  /** YYYY-MM-DD. */
  date: string;
  /** One line shown when the entry is collapsed. */
  summary: string;
  body: Block[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Split a line into plain, **bold** and `code` spans. An unmatched marker stays as text. */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const pattern = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index) });
    if (match[1] !== undefined) spans.push({ text: match[1], bold: true });
    else spans.push({ text: match[2], code: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans;
}

/** Paragraphs are separated by blank lines; lines starting with "- " make a list. */
export function parseBody(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of markdown.split(/\n\s*\n/)) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    if (lines.length === 0) continue;
    if (lines.every((line) => line.startsWith("- "))) {
      blocks.push({ type: "list", items: lines.map((line) => parseInline(line.slice(2))) });
    } else {
      blocks.push({ type: "paragraph", spans: parseInline(lines.join(" ")) });
    }
  }
  return blocks;
}

/**
 * Read one entry. The header is `key: value` lines between two `---` lines and needs a title, a
 * date (YYYY-MM-DD) and a summary. Returns an error string rather than throwing, so a bad entry
 * can be reported by a test instead of breaking the page.
 */
export function parseEntry(id: string, source: string): DevLogEntry | string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source.trim());
  if (!match) return `${id}: missing header`;
  const header: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon > 0) header[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  const { title, date, summary } = header;
  if (!title) return `${id}: missing title`;
  if (!date || !DATE.test(date) || Number.isNaN(Date.parse(date))) return `${id}: bad date`;
  if (!summary) return `${id}: missing summary`;
  const body = parseBody(match[2]);
  if (body.length === 0) return `${id}: empty entry`;
  return { id, title, date, summary, body };
}
