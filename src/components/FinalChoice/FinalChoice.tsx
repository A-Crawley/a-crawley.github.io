import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { TOUCH_TARGET } from "../../theme";

export interface FinalChoiceAct {
  id: string;
  label: string;
  detail: string;
}

export interface FinalChoiceProps {
  title: string;
  body: string;
  /** The button label. */
  action: string;
  /** The odds of the good ending in a word or two. Never a number. */
  odds: string;
  /** The parting acts to pick from before the button unlocks. Leave empty to skip the beat. */
  acts?: readonly FinalChoiceAct[];
  /** The act already picked (saved), or null. Once picked it cannot be changed. */
  picked?: string | null;
  onPick?: (id: string) => void;
  onChoose: () => void;
}

/**
 * The last decision of the game: one last act to pick, then one button and a vague word for how it
 * is likely to go. The act is narrative only. The button stays disabled until one is picked.
 */
export function FinalChoice({
  title,
  body,
  action,
  odds,
  acts = [],
  picked = null,
  onPick,
  onChoose,
}: FinalChoiceProps) {
  const needsAct = acts.length > 0 && picked === null;
  return (
    <Box component="section" aria-labelledby="final-choice-title">
      <Typography id="final-choice-title" component="h2" variant="h6">
        {title}
      </Typography>
      <Typography sx={{ my: 1 }}>{body}</Typography>
      {acts.length > 0 && (
        <FormControl component="fieldset" sx={{ my: 1, width: "100%" }}>
          <FormLabel component="legend" sx={{ mb: 0.5 }}>
            Before you go
          </FormLabel>
          <RadioGroup
            value={picked ?? ""}
            onChange={(event) => onPick?.(event.target.value)}
            aria-describedby="final-choice-act-note"
          >
            {acts.map((act) => (
              <FormControlLabel
                key={act.id}
                value={act.id}
                disabled={picked !== null && picked !== act.id}
                control={<Radio />}
                sx={{ minHeight: TOUCH_TARGET, alignItems: "flex-start", m: 0, py: 0.5 }}
                label={
                  <Box component="span" sx={{ display: "block", pt: "9px" }}>
                    <Typography component="span" sx={{ display: "block" }}>
                      {act.label}
                    </Typography>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {act.detail}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </RadioGroup>
          <Typography
            id="final-choice-act-note"
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {picked === null ? "Pick one to unlock the exit." : "Done. It cannot be taken back."}
          </Typography>
        </FormControl>
      )}
      <Typography color="text.secondary" sx={{ mb: 1.5 }}>
        Odds of getting through: <strong>{odds}</strong>
      </Typography>
      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={needsAct}
        onClick={onChoose}
        sx={{ py: 1.5 }}
      >
        {action}
      </Button>
    </Box>
  );
}
