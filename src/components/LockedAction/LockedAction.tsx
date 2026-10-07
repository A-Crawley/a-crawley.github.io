import { Box, Button, Typography } from "@mui/material";

export interface LockedActionProps {
  label: string;
  /** Short text saying why it is unavailable. Read out with the button. */
  hint: string;
}

/**
 * A button that does nothing yet. It uses aria-disabled rather than `disabled` so keyboard and
 * screen reader users can still find it and hear the hint.
 */
export function LockedAction({ label, hint }: LockedActionProps) {
  return (
    <Box>
      <Button
        variant="outlined"
        color="inherit"
        fullWidth
        aria-disabled="true"
        aria-describedby="locked-action-hint"
        onClick={(event) => event.preventDefault()}
        sx={{
          py: 1.5,
          borderStyle: "dashed",
          opacity: 0.55,
          cursor: "not-allowed",
          "&:hover": { backgroundColor: "transparent", borderStyle: "dashed" },
        }}
      >
        {label}
      </Button>
      <Typography id="locked-action-hint" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {hint}
      </Typography>
    </Box>
  );
}
