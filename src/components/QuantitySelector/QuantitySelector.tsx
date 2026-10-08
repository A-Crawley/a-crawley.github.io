import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { BuyQuantity } from "../../game/engine.ts";

export interface QuantitySelectorProps {
  value: BuyQuantity;
  options: readonly BuyQuantity[];
  onChange: (value: BuyQuantity) => void;
}

const labelFor = (option: BuyQuantity) => (option === "max" ? "Max" : `×${option}`);

/** Chooses how many units one press of a buy button gets. One option is always selected. */
export function QuantitySelector({ value, options, onChange }: QuantitySelectorProps) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      aria-label="Buy amount"
      value={value}
      onChange={(_event, next: BuyQuantity | null) => {
        if (next !== null) onChange(next);
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option} value={option} sx={{ px: 1.5 }}>
          {labelFor(option)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
