import { Box, Typography } from "@mui/material";
import { formatWait } from "../../game/format.ts";

export interface TargetStatusProps {
  /** The research level asked for. */
  goal: number;
  /** The research level the village has now. */
  current: number;
  /** Whole seconds left in the window. */
  secondsLeft: number;
}

/** The target the player accepted: what it asks, where the village is, and how long is left. */
export function TargetStatus({ goal, current, secondsLeft }: TargetStatusProps) {
  // Rounded up to ten seconds, so the line does not flicker as it counts down.
  const left = formatWait(Math.ceil(secondsLeft / 10) * 10);
  return (
    <Box component="section" aria-labelledby="target-status-title">
      <Typography id="target-status-title" component="h2" variant="h6">
        Quarterly target
      </Typography>
      <Typography sx={{ mt: 0.5 }}>
        Reach research level {goal} in {left}. The village is at level {current}.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Missing it costs nothing more.
      </Typography>
    </Box>
  );
}
