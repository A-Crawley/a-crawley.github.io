import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

export interface DevToolsProps {
  /** Facts about the game right now, for checking what the tools did. */
  readout: ReadonlyArray<{ label: string; value: string }>;
  bots: readonly string[];
  bot: string;
  onBotChange: (bot: string) => void;
  onSkip: (seconds: number) => void;
  onPlay: (goal: "ten-minutes" | "stage-2" | "stage-3" | "choice") => void;
  onGrant: () => void;
  onRefresh: () => void;
  onVillagers: () => void;
  onDrift: (kind: "compassionate" | "neutral" | "efficient") => void;
  onTurnOff: () => void;
}

const SKIPS: ReadonlyArray<{ label: string; seconds: number }> = [
  { label: "1 min", seconds: 60 },
  { label: "10 min", seconds: 600 },
  { label: "1 hour", seconds: 3600 },
];

const PLAYS: ReadonlyArray<{
  label: string;
  goal: DevToolsProps["onPlay"] extends (g: infer G) => void ? G : never;
}> = [
  { label: "10 min", goal: "ten-minutes" },
  { label: "To stage 2", goal: "stage-2" },
  { label: "To stage 3", goal: "stage-3" },
  { label: "To the final choice", goal: "choice" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" aria-label={title} sx={{ mb: 2 }}>
      <Typography component="h3" sx={{ fontWeight: 700, mb: 0.75 }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>{children}</Box>
    </Box>
  );
}

/** Shortcuts for testing the game without playing it. Only shown in dev mode. */
export function DevTools({
  readout,
  bots,
  bot,
  onBotChange,
  onSkip,
  onPlay,
  onGrant,
  onRefresh,
  onVillagers,
  onDrift,
  onTurnOff,
}: DevToolsProps) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These change your real save. Export it first if you want to keep it.
      </Typography>
      <Group title="Skip time">
        {SKIPS.map(({ label, seconds }) => (
          <Button key={label} variant="outlined" onClick={() => onSkip(seconds)}>
            Skip {label}
          </Button>
        ))}
      </Group>
      <Group title="Let a bot play">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={bot}
          onChange={(_, next: string | null) => next && onBotChange(next)}
          aria-label="Which bot plays"
        >
          {bots.map((name) => (
            <ToggleButton key={name} value={name}>
              {name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", width: "100%" }}>
          {PLAYS.map(({ label, goal }) => (
            <Button key={label} variant="outlined" onClick={() => onPlay(goal)}>
              Play {label}
            </Button>
          ))}
        </Box>
      </Group>
      <Group title="Give">
        <Button variant="outlined" onClick={onGrant}>
          More food and wood
        </Button>
        <Button variant="outlined" onClick={onVillagers}>
          10 villagers
        </Button>
        <Button variant="outlined" onClick={onRefresh}>
          Full morale
        </Button>
      </Group>
      <Group title="Set the drift">
        <Button variant="outlined" onClick={() => onDrift("compassionate")}>
          Compassionate
        </Button>
        <Button variant="outlined" onClick={() => onDrift("neutral")}>
          Neutral
        </Button>
        <Button variant="outlined" onClick={() => onDrift("efficient")}>
          Efficient
        </Button>
      </Group>
      <Box component="dl" aria-label="Game readout" sx={{ m: 0, display: "grid", rowGap: 0.5 }}>
        {readout.map((row) => (
          <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Typography component="dt" color="text.secondary">
              {row.label}
            </Typography>
            <Typography component="dd" sx={{ m: 0, textAlign: "right" }}>
              {row.value}
            </Typography>
          </Box>
        ))}
      </Box>
      <Button color="inherit" onClick={onTurnOff} sx={{ mt: 2 }}>
        Turn off developer tools
      </Button>
    </Box>
  );
}
