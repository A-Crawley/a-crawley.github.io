import { Box, Button, Typography } from "@mui/material";

export interface FinalChoiceProps {
  title: string;
  body: string;
  /** The button label. */
  action: string;
  /** The odds of the good ending in a word or two. Never a number. */
  odds: string;
  onChoose: () => void;
}

/** The last decision of the game: one button, and a vague word for how it is likely to go. */
export function FinalChoice({ title, body, action, odds, onChoose }: FinalChoiceProps) {
  return (
    <Box component="section" aria-labelledby="final-choice-title">
      <Typography id="final-choice-title" component="h2" variant="h6">
        {title}
      </Typography>
      <Typography sx={{ my: 1 }}>{body}</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.5 }}>
        Odds of getting through: <strong>{odds}</strong>
      </Typography>
      <Button variant="contained" size="large" fullWidth onClick={onChoose} sx={{ py: 1.5 }}>
        {action}
      </Button>
    </Box>
  );
}
