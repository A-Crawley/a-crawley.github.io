import { Box, Button, Typography } from "@mui/material";
import { TOUCH_TARGET } from "../../theme";

export interface BriefChoiceOption {
  id: string;
  label: string;
  /** What it does, in words. */
  detail: string;
}

export interface BriefChoiceProps {
  title: string;
  body: string;
  options: readonly BriefChoiceOption[];
  onChoose: (id: string) => void;
}

/** A one-off choice offered at the start of stage 2: pick a brief for the research, once. */
export function BriefChoice({ title, body, options, onChoose }: BriefChoiceProps) {
  return (
    <Box component="section" aria-labelledby="brief-choice-title">
      <Typography id="brief-choice-title" component="h2" variant="h6">
        {title}
      </Typography>
      <Typography sx={{ my: 1 }}>{body}</Typography>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { sm: "1fr 1fr" } }}>
        {options.map((option) => (
          <Button
            key={option.id}
            variant="outlined"
            color="inherit"
            onClick={() => onChoose(option.id)}
            sx={{
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              textTransform: "none",
              minHeight: TOUCH_TARGET,
            }}
          >
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {option.label}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {option.detail}
            </Typography>
          </Button>
        ))}
      </Box>
    </Box>
  );
}
