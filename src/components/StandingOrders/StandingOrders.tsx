import { Box, TextField, Typography } from "@mui/material";
import { useId } from "react";
import { TOUCH_TARGET } from "../../theme";

export interface StandingOrderRow {
  id: string;
  /** The job or building, as the shop names it. */
  label: string;
  /** The cap now in force, or 0 for no order. */
  cap: number;
  /** How many the village has. */
  owned: number;
  /** What the order does, in words ("Builds when fewer than 2 beds are free"). */
  rule: string;
}

export interface StandingOrdersProps {
  rows: readonly StandingOrderRow[];
  /** The highest cap that can be set. */
  maxCap: number;
  /** Said once above the rows: the reserve the orders always leave. */
  note: string;
  onChange: (id: string, cap: number) => void;
}

/** Standing orders: a cap per job or building. 0 means the village does nothing on its own. */
export function StandingOrders({ rows, maxCap, note, onChange }: StandingOrdersProps) {
  const prefix = useId();
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {note}
      </Typography>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.5 }}>
        {rows.map((row) => (
          <Box component="li" key={row.id}>
            <TextField
              id={`${prefix}-${row.id}`}
              type="number"
              fullWidth
              size="small"
              label={`${row.label}: keep up to`}
              value={row.cap}
              onChange={(event) => {
                const parsed = Math.floor(Number(event.target.value));
                onChange(
                  row.id,
                  Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), maxCap) : 0,
                );
              }}
              helperText={`${row.cap === 0 ? "Off. " : ""}${row.rule} You have ${row.owned}.`}
              slotProps={{
                htmlInput: { min: 0, max: maxCap, step: 1, inputMode: "numeric" },
                input: { sx: { minHeight: TOUCH_TARGET, fontVariantNumeric: "tabular-nums" } },
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
