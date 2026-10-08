import { Box, Typography } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";
import { tabularNumbers, visuallyHidden } from "../../theme";

export interface ResourceCounterProps {
  label: string;
  value: number;
  /** Output per second. Leave out to hide the rate. */
  perSecond?: number;
  /** Eaten each second, if anything is. The counter then shows what is left after it. */
  upkeep?: number;
  /** Most the village can hold. Leave out for a stock with no ceiling. */
  capacity?: number;
  /**
   * "large" for the main resource, "medium" for the main resource in a narrow rail, "small" for the
   * others, "compact" for a tight strip: the value and a short rate, with the full text kept for
   * screen readers.
   */
  size?: "large" | "medium" | "small" | "compact";
}

/** A resource name, how much the player has, and how fast it is growing. */
export function ResourceCounter({
  label,
  value,
  perSecond,
  upkeep = 0,
  capacity,
  size = "large",
}: ResourceCounterProps) {
  const format = useNumberFormat();
  const net = perSecond === undefined ? 0 : perSecond - upkeep;
  const full = capacity !== undefined && value >= capacity;
  const details = (
    <>
      {capacity !== undefined && (
        <Typography variant="body2" color="text.secondary">
          {full
            ? `Store full (${format.amount(capacity)}): anything more is lost`
            : `Store holds up to ${format.amount(capacity)}`}
        </Typography>
      )}
      {perSecond !== undefined && (
        <Typography variant="body1" color="text.secondary">
          {rateText(perSecond, upkeep, format.rate)}
        </Typography>
      )}
    </>
  );
  if (size === "compact") {
    const shortRate =
      perSecond === undefined
        ? null
        : net > 0.005
          ? `+${format.rate(net)}/s`
          : net < -0.005
            ? `\u2212${format.rate(-net)}/s`
            : "steady";
    return (
      <Box component="section" aria-label={label} sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" component="p">
          {label}
        </Typography>
        <Typography
          component="p"
          sx={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2, ...tabularNumbers }}
        >
          {format.amount(value)}
        </Typography>
        <Typography
          variant="caption"
          component="p"
          aria-hidden
          color={full || net < -0.005 ? "warning.light" : "text.secondary"}
          sx={{ fontWeight: full || net < -0.005 ? 700 : 400, ...tabularNumbers }}
        >
          {full ? "Store full" : shortRate}
        </Typography>
        <Box sx={visuallyHidden}>{details}</Box>
      </Box>
    );
  }
  const valueSx = {
    large: { fontSize: { xs: "3.5rem", sm: "5rem" }, fontWeight: 700, lineHeight: 1.05 },
    medium: { fontSize: "3.25rem", fontWeight: 700, lineHeight: 1.1 },
    small: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 },
  }[size];
  return (
    <Box component="section" aria-label={label}>
      <Typography variant="body1" color="text.secondary">
        {label}
      </Typography>
      <Typography component="p" sx={{ ...valueSx, ...tabularNumbers }}>
        {format.amount(value)}
      </Typography>
      {details}
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
