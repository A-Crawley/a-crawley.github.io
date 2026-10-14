import { Box, Button, Typography } from "@mui/material";
import { TOUCH_TARGET } from "../../theme";

export interface ExchangeOffer {
  id: string;
  /** What the button does, with the figures: "Sell 20 wood for 14 food". */
  label: string;
  possible: boolean;
  /** Why it cannot be done right now, shown under the button. Empty when it can. */
  reason?: string;
}

export interface ExchangeProps {
  offers: readonly ExchangeOffer[];
  /** The current rate, in words. */
  rateNote: string;
  onTrade: (id: string) => void;
}

/** The Exchange: one button per direction, with the reason a trade is blocked kept on screen. */
export function Exchange({ offers, rateNote, onTrade }: ExchangeProps) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {rateNote}
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1 }}>
        {offers.map((offer) => (
          <Box component="li" key={offer.id}>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              disabled={!offer.possible}
              onClick={() => onTrade(offer.id)}
              sx={{
                minHeight: TOUCH_TARGET,
                justifyContent: "flex-start",
                textTransform: "none",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {offer.label}
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", minHeight: "1.5em" }}
            >
              {offer.possible ? "" : offer.reason}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
