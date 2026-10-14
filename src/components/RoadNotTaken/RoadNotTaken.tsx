import { useId, useState } from "react";
import { Box, Button, Typography } from "@mui/material";

export interface RoadNotTakenProps {
  /** The name of the ending the player did not get. */
  title: string;
  /** Its opening line. */
  opening: string;
}

/**
 * The ending the player did not get, hidden until they ask: it is a spoiler for anyone who wants to
 * play again. Shows the opening line only, never odds or thresholds.
 */
export function RoadNotTaken({ title, opening }: RoadNotTakenProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <Box component="section" aria-label="The road not taken">
      <Typography component="h3" variant="h6">
        The road not taken
      </Typography>
      <Button
        variant="text"
        color="inherit"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        sx={{ px: 0 }}
      >
        {open ? "Hide the other ending" : "Show the other ending"}
      </Button>
      <Box id={bodyId} hidden={!open}>
        {open && (
          <>
            <Typography>
              <strong>{title}:</strong> {opening}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Start a new game if you want to see how it plays out.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
