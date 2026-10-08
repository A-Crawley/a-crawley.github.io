import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

export interface EndingStat {
  label: string;
  value: string;
}

export interface EndingScreenProps {
  title: string;
  /** What happened at the exit. */
  paragraphs: readonly string[];
  /** The reveal both endings share. */
  reveal: readonly string[];
  /** One line on how the run read. */
  verdict: string;
  stats: readonly EndingStat[];
  /** Starts a new game. Only called after the player confirms. */
  onNewGame: () => void;
}

/** The end of the game: what happened, the reveal, a few stats, and a way to start again. */
export function EndingScreen({
  title,
  paragraphs,
  reveal,
  verdict,
  stats,
  onNewGame,
}: EndingScreenProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Stack component="article" spacing={3} aria-labelledby="ending-title">
      <Typography id="ending-title" component="h2" variant="h4" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {paragraphs.map((text) => (
          <Typography key={text}>{text}</Typography>
        ))}
      </Stack>
      <Stack spacing={1.5}>
        {reveal.map((text) => (
          <Typography key={text} color="text.secondary">
            {text}
          </Typography>
        ))}
      </Stack>
      <Typography>{verdict}</Typography>
      <Box component="section" aria-label="Your run">
        <Typography component="h3" variant="h6">
          Your run
        </Typography>
        <Box component="dl" sx={{ m: 0 }}>
          {stats.map(({ label, value }) => (
            <Box
              key={label}
              sx={{ display: "flex", justifyContent: "space-between", py: 0.5, gap: 2 }}
            >
              <Typography component="dt" color="text.secondary">
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Button variant="outlined" color="inherit" onClick={() => setConfirming(true)}>
        Start a new game
      </Button>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Start a new game?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This ends the run above and begins again from Day 1. Export your save first if you want
            to keep it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Keep this ending</Button>
          <Button
            onClick={() => {
              setConfirming(false);
              onNewGame();
            }}
          >
            Start over
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
