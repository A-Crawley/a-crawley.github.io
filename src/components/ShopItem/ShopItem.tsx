import { Box, Button, Typography } from "@mui/material";
import { formatAmount } from "../../game/format.ts";

export interface ShopItemProps {
  name: string;
  description: string;
  owned: number;
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
  cost,
  currency,
  output,
  affordable,
  onBuy,
}: ShopItemProps) {
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
          <Typography component="span" color="text.secondary">
            × {owned}
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
        aria-label={`Hire ${name}`}
        sx={{ flexShrink: 0, minWidth: 96, flexDirection: "column", lineHeight: 1.2 }}
      >
        Hire
        <Typography component="span" variant="caption">
          {formatAmount(cost)} {currency}
        </Typography>
      </Button>
    </Box>
  );
}
