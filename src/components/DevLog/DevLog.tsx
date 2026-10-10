import { Box, Typography } from "@mui/material";
import type { Block, DevLogEntry, InlineSpan } from "../../devlog/parse.ts";

export interface DevLogProps {
  entries: readonly DevLogEntry[];
}

function Spans({ spans }: { spans: readonly InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.bold ? (
          <strong key={i}>{span.text}</strong>
        ) : span.code ? (
          <Box component="code" key={i} sx={{ fontFamily: "monospace", fontSize: "0.9em" }}>
            {span.text}
          </Box>
        ) : (
          <span key={i}>{span.text}</span>
        ),
      )}
    </>
  );
}

function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <>
      {blocks.map((block, i) =>
        block.type === "paragraph" ? (
          <Typography key={i} variant="body2" sx={{ mb: 1 }}>
            <Spans spans={block.spans} />
          </Typography>
        ) : (
          <Box component="ul" key={i} sx={{ pl: 2.5, mt: 0, mb: 1 }}>
            {block.items.map((item, j) => (
              <Typography component="li" variant="body2" key={j} sx={{ mb: 0.5 }}>
                <Spans spans={item} />
              </Typography>
            ))}
          </Box>
        ),
      )}
    </>
  );
}

function formatDate(date: string): string {
  // Local midnight, so the day shown is the day written whatever the reader's time zone.
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * The dev log: what changed in the game and why, newest first. Each entry opens and closes with the
 * keyboard like any disclosure; the newest starts open.
 */
export function DevLog({ entries }: DevLogProps) {
  if (entries.length === 0) {
    return <Typography color="text.secondary">Nothing has been written yet.</Typography>;
  }
  return (
    <Box>
      {entries.map((entry, index) => (
        <Box
          component="details"
          key={entry.id}
          open={index === 0}
          sx={{ borderTop: index === 0 ? "none" : "1px solid", borderColor: "divider", py: 1 }}
        >
          <Box component="summary" sx={{ cursor: "pointer", minHeight: 44, py: 0.5 }}>
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {entry.title}
            </Typography>
            <Typography component="div" variant="body2" color="text.secondary">
              <time dateTime={entry.date}>{formatDate(entry.date)}</time>
              {" – "}
              {entry.summary}
            </Typography>
          </Box>
          <Box sx={{ pt: 1 }}>
            <Blocks blocks={entry.body} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
