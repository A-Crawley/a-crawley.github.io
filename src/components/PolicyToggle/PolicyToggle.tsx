import { FormControlLabel, Switch, Typography, Box } from "@mui/material";

export interface PolicyToggleProps {
  label: string;
  /** What it does, including the catch. */
  description: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}

/** A policy the player can switch on or off, with what it does underneath. */
export function PolicyToggle({ label, description, checked, onChange }: PolicyToggleProps) {
  return (
    <Box>
      <FormControlLabel
        control={<Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />}
        label={label}
        slotProps={{ typography: { sx: { fontWeight: 600 } } }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ ml: 6 }}>
        {description}
      </Typography>
    </Box>
  );
}
