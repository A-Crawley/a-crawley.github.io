import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { formatAmount, NOTATION_LABELS, NOTATIONS } from "../../game/format.ts";
import type { Notation } from "../../game/format.ts";

export interface NotationPickerProps {
  value: Notation;
  onChange: (notation: Notation) => void;
}

/** A number big enough to show how each notation looks. */
const EXAMPLE = 1_234_567_890;

/** Chooses how big numbers are written, with a live example of the current choice. */
export function NotationPicker({ value, onChange }: NotationPickerProps) {
  return (
    <FormControl>
      <FormLabel id="notation-label">Number notation</FormLabel>
      <RadioGroup
        aria-labelledby="notation-label"
        value={value}
        onChange={(event) => onChange(event.target.value as Notation)}
      >
        {NOTATIONS.map((notation) => (
          <FormControlLabel
            key={notation}
            value={notation}
            control={<Radio />}
            label={NOTATION_LABELS[notation]}
          />
        ))}
      </RadioGroup>
      <Typography variant="body2" color="text.secondary" aria-live="polite">
        1,234,567,890 is shown as {formatAmount(EXAMPLE, value)}.
      </Typography>
    </FormControl>
  );
}
