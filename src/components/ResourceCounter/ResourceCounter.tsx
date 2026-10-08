import { Box, Typography } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";

export interface ResourceCounterProps {
  label: string;
  value: number;
  /** Output per second. Leave out to hide the rate. */
  perSecond?: number;
  /** "large" for the main resource, "small" for the others. */
  size?: "large" | "small";
}

/** A resource name, how much the player has, and how fast it is growing. */
export function ResourceCounter({ label, value, perSecond, size = "large" }: ResourceCounterProps) {
  const format = useNumberFormat();
  return (
    <Box component="section" aria-label={label}>
      <Typography variant="body1" color="text.secondary">
        {label}
      </Typography>
      <Typography
        component="p"
        sx={
          size === "large"
            ? { fontSize: { xs: "3.5rem", sm: "5rem" }, fontWeight: 700, lineHeight: 1.05 }
            : { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }
        }
      >
        {format.amount(value)}
      </Typography>
      {perSecond !== undefined && (
        <Typography variant="body1" color="text.secondary">
          {perSecond > 0
            ? `+${format.rate(perSecond)} per second`
            : "Nothing arrives by itself yet"}
        </Typography>
      )}
    </Box>
  );
}
