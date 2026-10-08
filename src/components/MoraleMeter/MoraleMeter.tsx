import { Box, LinearProgress, Typography } from "@mui/material";

export interface MoraleMeterProps {
  /** 0 to 100. */
  morale: number;
  /** Set while output is affected by something other than the level itself. */
  status?: "resting" | "walkout";
}

function describe(morale: number): string {
  if (morale >= 80) return "Thriving";
  if (morale >= 60) return "Holding up";
  if (morale >= 40) return "Strained";
  if (morale >= 20) return "Close to a walkout";
  return "Unrest";
}

const STATUS_TEXT = {
  resting: "Rest day: nobody is producing anything, on purpose.",
  walkout: "Walkout: output is halved until they come back.",
} as const;

/** How the village feels, as a labelled bar and a few words. */
export function MoraleMeter({ morale, status }: MoraleMeterProps) {
  const value = Math.round(Math.max(0, Math.min(100, morale)));
  return (
    <Box component="section" aria-label="Morale">
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography id="morale-label" variant="body1" color="text.secondary">
          Morale
        </Typography>
        <Typography variant="body1">{describe(value)}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={value < 30 ? "error" : "primary"}
        aria-labelledby="morale-label"
        aria-valuetext={`${value} out of 100, ${describe(value)}`}
        sx={{ height: 8, borderRadius: 4 }}
      />
      {status && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {STATUS_TEXT[status]}
        </Typography>
      )}
    </Box>
  );
}
