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
  onBuy,
}: ShopItemProps) {
  const format = useNumberFormat();
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
      </Box>
      <Button
        variant="contained"
        color={affordable ? "primary" : "inherit"}
        disabled={!affordable}
        onClick={onBuy}
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
