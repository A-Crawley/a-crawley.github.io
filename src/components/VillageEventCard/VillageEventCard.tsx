import { Box, Button, Typography } from "@mui/material";

export interface VillageEventChoice {
  id: string;
  label: string;
  /** What it does, in a sentence. */
  detail: string;
  /** The price in words ("40 food"), or null when it is free. */
  cost: string | null;
  disabled: boolean;
}

export interface VillageEventCardProps {
  title: string;
  body: string;
  choices: readonly VillageEventChoice[];
  /** Whole seconds until it is decided for the player. */
  secondsLeft: number;
  onChoose: (id: string) => void;
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A question from the village. The layout floats it clear of the page, so showing or answering it
 * moves nothing and the Gather button stays usable. It answers itself if left long enough.
 */
export function VillageEventCard({
  title,
  body,
  choices,
  secondsLeft,
  onChoose,
}: VillageEventCardProps) {
  return (
    <Box
      component="section"
      aria-labelledby="village-event-title"
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      {/* Announced when it appears; the rest of the card is read in the normal way. */}
      <Typography id="village-event-title" component="h2" variant="h6" role="status">
        {title}
      </Typography>
      <Typography sx={{ my: 1 }}>{body}</Typography>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { sm: "1fr 1fr" } }}>
        {choices.map((choice) => (
          <Button
            key={choice.id}
            variant="outlined"
            color="inherit"
            disabled={choice.disabled}
            onClick={() => onChoose(choice.id)}
            sx={{
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              textTransform: "none",
              minHeight: 64,
            }}
          >
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {choice.label}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {choice.detail}
              {choice.cost ? ` Costs ${choice.cost}.` : ""}
            </Typography>
          </Button>
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        If nobody decides, it will be decided for you in {clock(secondsLeft)}.
      </Typography>
    </Box>
  );
}
