import { Box, Typography } from "@mui/material";

export interface SkyNotesProps {
  /** What has been seen, oldest first. */
  notes: readonly string[];
}

/** A list of the things the player has seen in the sky. */
export function SkyNotes({ notes }: SkyNotesProps) {
  if (notes.length === 0) {
    return <Typography color="text.secondary">Nothing seen yet. Try looking up.</Typography>;
  }
  return (
    <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
      {notes.map((note) => (
        <Typography component="li" variant="body2" key={note} sx={{ mb: 1 }}>
          {note}
        </Typography>
      ))}
    </Box>
  );
}
