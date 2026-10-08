import { Box, Typography } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";

export interface ResourceCounterProps {
  label: string;
  value: number;
  /** Output per second. Leave out to hide the rate. */
  perSecond?: number;
  /** Eaten each second, if anything is. The counter then shows what is left after it. */
  upkeep?: number;
  /** "large" for the main resource, "small" for the others. */
  size?: "large" | "small";
}

/** A resource name, how much the player has, and how fast it is growing. */
export function ResourceCounter({
  label,
  value,
  perSecond,
  upkeep = 0,
  size = "large",
}: ResourceCounterProps) {
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
          {rateText(perSecond, upkeep, format.rate)}
        </Typography>
      )}
    </Box>
  );
}

function rateText(gross: number, upkeep: number, rate: (value: number) => string): string {
  if (upkeep <= 0) {
    return gross > 0 ? `+${rate(gross)} per second` : "Nothing arrives by itself yet";
  }
  const net = gross - upkeep;
  const eaten = `villagers eat ${rate(upkeep)}`;
  if (net > 0.005) return `+${rate(net)} per second after ${eaten}`;
  if (net < -0.005) return `Falling by ${rate(-net)} per second: ${eaten}`;
  return `Holding steady: ${eaten}`;
}
