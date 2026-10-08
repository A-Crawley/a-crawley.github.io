import { Box, Typography } from "@mui/material";

export interface EventLogLine {
  id: string;
  text: string;
}

export interface EventLogProps {
  title: string;
  /** Oldest first. The log shows the newest at the top. */
  lines: readonly EventLogLine[];
  /** Tallest the list may grow, in px, before it scrolls inside its own box. Leave out for no limit. */
  maxHeight?: number;
}

/** The village log. A polite live region, so new lines are announced without interrupting. */
export function EventLog({ title, lines, maxHeight }: EventLogProps) {
  const newestFirst = [...lines].reverse();
  return (
    <Box component="section">
      <Typography component="h2" variant="h6" id="event-log-title">
        {title}
      </Typography>
      <Box
        role="log"
        aria-labelledby="event-log-title"
        aria-live="polite"
        aria-relevant="additions"
        // A box that scrolls must be reachable by keyboard.
        tabIndex={maxHeight === undefined ? undefined : 0}
        sx={{
          mt: 1,
          ...(maxHeight !== undefined && { maxHeight, overflowY: "auto", pr: 1 }),
        }}
      >
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {newestFirst.map((line, index) => (
            <Typography
              key={line.id}
              component="li"
              variant="body2"
              color={index === 0 ? "text.primary" : "text.secondary"}
              sx={{ listStyle: "none", py: 0.5 }}
            >
              {line.text}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
