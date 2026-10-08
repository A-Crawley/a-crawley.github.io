import { Box, Button, Typography } from "@mui/material";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";

export interface UpgradeListItem {
  id: string;
  name: string;
  description: string;
  /** What it does, in numbers, e.g. "Foragers make 25% more". */
  effect: string;
  cost: number;
  /** What the cost is paid in, e.g. "wood". */
  currency: string;
  affordable: boolean;
}

export interface UpgradeListProps {
  /** Upgrades on offer, not yet bought. */
  items: readonly UpgradeListItem[];
  /** Names of upgrades already bought. */
  bought: readonly string[];
  onBuy: (id: string) => void;
}

/** One-off purchases. Each can be bought once; bought ones fall off the list into a line below it. */
export function UpgradeList({ items, bought, onBuy }: UpgradeListProps) {
  const format = useNumberFormat();
  return (
    <Box component="section" aria-labelledby="upgrades-title">
      <Typography component="h2" variant="h6" id="upgrades-title">
        Upgrades
      </Typography>
      {items.length === 0 ? (
        <Typography color="text.secondary">Nothing to upgrade at the moment.</Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {items.map((item) => (
            <Box
              key={item.id}
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
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.effect}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color={item.affordable ? "primary" : "inherit"}
                disabled={!item.affordable}
                onClick={() => onBuy(item.id)}
                aria-label={`Buy ${item.name}`}
                sx={{
                  flexShrink: 0,
                  minWidth: 96,
                  flexDirection: "column",
                  lineHeight: 1.2,
                  "&.Mui-disabled": {
                    color: "text.secondary",
                    backgroundColor: "rgba(255,255,255,0.06)",
                  },
                }}
              >
                Buy
                <Typography component="span" variant="caption">
                  {format.amount(item.cost)} {item.currency}
                </Typography>
              </Button>
            </Box>
          ))}
        </Box>
      )}
      {bought.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Bought: {bought.join(", ")}
        </Typography>
      )}
    </Box>
  );
}
