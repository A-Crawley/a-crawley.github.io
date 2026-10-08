import { Box, Button, Typography } from "@mui/material";
import { LockedAction } from "../LockedAction";

export interface LookUpActionProps {
  /** Whether the button has come alive. Until then it is a greyed-out placeholder. */
  unlocked: boolean;
  /** What the player saw when they looked up, or null if they have not looked yet. */
  sighting: string | null;
  onLookUp: () => void;
}

/**
 * The "Look up" button. Greyed out at first, then active; pressing it shows a small, wrong thing
 * in the sky. The sighting text is plain (not a live region), so it can update without chatter.
 */
export function LookUpAction({ unlocked, sighting, onLookUp }: LookUpActionProps) {
  if (!unlocked) return <LockedAction label="Look up" hint="Not ready yet." />;
  return (
    <Box>
      <Button variant="outlined" color="inherit" fullWidth onClick={onLookUp} sx={{ py: 1.5 }}>
        Look up
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {sighting ?? "Something is different about the sky."}
      </Typography>
    </Box>
  );
}
