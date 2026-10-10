import { Box, Button, Typography } from "@mui/material";
import { LockedAction } from "../LockedAction";

export interface LookUpActionProps {
  /** Whether the button has come alive. Until then it is a greyed-out placeholder. */
  unlocked: boolean;
  /** What the player saw the last time they looked up, or null if they have not looked yet. */
  sighting: string | null;
  /** Whole seconds until it can be used again. 0 when it is ready. */
  waitSeconds?: number;
  /** How long a look stops the village's work, in seconds. Shown so the cost is plain. */
  pauseSeconds?: number;
  onLookUp: () => void;
}

/**
 * The "Look up" button. Greyed out at first, then active. Pressing it shows something in the sky,
 * pauses the village's work for a moment and then needs a short wait. The sighting is announced to
 * screen readers when it changes; the wait is plain text, so it does not chatter every second.
 */
export function LookUpAction({
  unlocked,
  sighting,
  waitSeconds = 0,
  pauseSeconds,
  onLookUp,
}: LookUpActionProps) {
  if (!unlocked) return <LockedAction label="Look up" hint="Not ready yet." />;
  const waiting = waitSeconds > 0;
  return (
    <Box>
      <Button
        variant="outlined"
        color="inherit"
        fullWidth
        disabled={waiting}
        onClick={onLookUp}
        sx={{ py: 1.5 }}
      >
        Look up
      </Button>
      {/* Room for three lines, so a long sighting does not push the shop down. */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5, lineHeight: 1.5, minHeight: "4.5em" }}
        role="status"
      >
        {sighting ?? "Something is different about the sky."}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ mt: 0.5, lineHeight: 1.5, minHeight: "1.5em" }}
      >
        {waiting
          ? `Ready again in ${waitSeconds} ${waitSeconds === 1 ? "second" : "seconds"}.`
          : pauseSeconds
            ? `Looking up pauses work for ${pauseSeconds} seconds.`
            : null}
      </Typography>
    </Box>
  );
}
