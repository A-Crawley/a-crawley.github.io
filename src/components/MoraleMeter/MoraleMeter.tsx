import { useId } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";

export interface MoraleMeterProps {
  /** 0 to 100. */
  morale: number;
  /** Set while output is affected by something other than the level itself. */
  status?: "resting" | "walkout";
  /** What is moving morale, strongest first. Only the top two are shown. */
  reasons?: ReadonlyArray<{ label: string; lifting: boolean }>;
  /** One tight row for a sticky strip: the bar and a word for it, and the status if there is one. */
  compact?: boolean;
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
export function MoraleMeter({ morale, status, reasons = [], compact = false }: MoraleMeterProps) {
  const labelId = useId();
  const top = reasons.slice(0, 2);
  const falling = top.filter((r) => !r.lifting).map((r) => r.label);
  const rising = top.filter((r) => r.lifting).map((r) => r.label);
  const value = Math.round(Math.max(0, Math.min(100, morale)));
  if (compact) {
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography id={labelId} variant="body2" color="text.secondary">
            Morale
          </Typography>
          <LinearProgress
            variant="determinate"
            value={value}
            color={value < 30 ? "error" : "primary"}
            aria-labelledby={labelId}
            aria-valuetext={`${value} out of 100, ${describe(value)}`}
            sx={{ height: 8, borderRadius: 4, flexGrow: 1 }}
          />
          <Typography variant="body2" sx={{ minWidth: "7.5em", textAlign: "right" }}>
            {describe(value)}
          </Typography>
        </Box>
        {status && (
          <Typography variant="body2" color="text.secondary">
            {STATUS_TEXT[status]}
          </Typography>
        )}
      </Box>
    );
  }
  return (
    <Box component="section" aria-label="Morale">
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography id={labelId} variant="body1" color="text.secondary">
          Morale
        </Typography>
        <Typography variant="body1">{describe(value)}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={value < 30 ? "error" : "primary"}
        aria-labelledby={labelId}
        aria-valuetext={`${value} out of 100, ${describe(value)}`}
        sx={{ height: 8, borderRadius: 4 }}
      />
      {falling.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Falling: {falling.join(", ")}
        </Typography>
      )}
      {rising.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Rising: {rising.join(", ")}
        </Typography>
      )}
      {status && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {STATUS_TEXT[status]}
        </Typography>
      )}
    </Box>
  );
}
