import { parseEntry } from "./parse.ts";
import type { DevLogEntry } from "./parse.ts";

/** Every Markdown file in this folder, read at build time. */
const files = import.meta.glob<string>("./entries/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export interface LoadedDevLog {
  entries: DevLogEntry[];
  /** Entries that could not be read, as messages. Empty unless a file is broken. */
  problems: string[];
}

/** Read and order entries: newest date first, and within one day the later file name first. */
export function loadEntries(sources: Record<string, string>): LoadedDevLog {
  const entries: DevLogEntry[] = [];
  const problems: string[] = [];
  for (const [path, source] of Object.entries(sources)) {
    const id = path.replace(/^.*\//, "").replace(/\.md$/, "");
    const entry = parseEntry(id, source);
    if (typeof entry === "string") problems.push(entry);
    else entries.push(entry);
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return { entries, problems };
}

export const DEV_LOG: LoadedDevLog = loadEntries(files);
