import { useId } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";

export interface ShopItemProps {
  name: string;
  description: string;
  owned: number;
  /** The verb on the button, e.g. "Hire" or "Build". */
  actionLabel: string;
  /** Units one press buys. Shown on the button when more than one. */
  count?: number;
  cost: number;
  /** What the cost is paid in, e.g. "food". */
  currency: string;
  /** What one unit produces, e.g. "0.4 food per second". */
  output: string;
  affordable: boolean;
  /** Why it can't be bought even when the player could pay, e.g. nobody free to hire. */
  blockedReason?: string;
  /**
   * Keep room for the reason even when there is none, so the row does not change height when it
   * appears or goes. Set it on rows that can be blocked.
   */
  reserveReasonSpace?: boolean;
  onBuy: () => void;
}

/** One thing the player can buy: what it is, what it makes, what it costs and a Hire button. */
export function ShopItem({
  name,
  description,
  owned,
  actionLabel,
  count = 1,
  cost,
  currency,
  output,
  affordable,
  blockedReason,
  reserveReasonSpace = false,
  onBuy,
}: ShopItemProps) {
  const format = useNumberFormat();
  const reasonId = useId();
  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        display: "flex",
        gap: 2,
        alignItems: "center",
        justifyContent: "space-between",
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h3" sx={{ fontWeight: 700 }}>
          {name}{" "}
          <Typography component="span" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            × {format.amount(owned)}
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Makes {output}
        </Typography>
        {(blockedReason || reserveReasonSpace) && (
          <Typography
            id={reasonId}
            variant="body2"
            color="secondary.main"
            // Two lines of body2 (1.43 line height), so the row is the same height either way.
            sx={reserveReasonSpace ? { minHeight: "2.86em" } : undefined}
          >
            {blockedReason}
          </Typography>
        )}
      </Box>
      <Button
        variant="contained"
        color={affordable ? "primary" : "inherit"}
        disabled={!affordable}
        onClick={onBuy}
        aria-describedby={blockedReason ? reasonId : undefined}
        aria-label={`${actionLabel} ${count > 1 ? `${count} × ` : ""}${name}`}
        sx={{
          flexShrink: 0,
          minWidth: 96,
          flexDirection: "column",
          lineHeight: 1.2,
          // Keep the price readable when the button is unavailable.
          "&.Mui-disabled": { color: "text.secondary", backgroundColor: "rgba(255,255,255,0.06)" },
        }}
      >
        {actionLabel}
        {count > 1 ? ` ×${count}` : ""}
        <Typography component="span" variant="caption">
          {format.amount(cost)} {currency}
        </Typography>
      </Button>
    </Box>
  );
}
