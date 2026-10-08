import { Box, LinearProgress, Typography } from "@mui/material";

export interface ProjectProgressProps {
  /** Name of the project, for example "Project Horizon". */
  label: string;
  /** How far along it is, from 0 to 1. Values outside that range are clamped. */
  fraction: number;
  /** A dry remark under the bar. */
  caption?: string;
}

/** A labelled progress bar for the goal of the current stage. */
export function ProjectProgress({ label, fraction, caption }: ProjectProgressProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const percent = Math.floor(clamped * 100);
  return (
    <Box component="section" aria-label={label}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {percent}% complete
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-label={`${label} progress`}
        sx={{ my: 0.75, height: 8, borderRadius: 4 }}
      />
      {caption && (
        <Typography variant="body2" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Box>
  );
}
