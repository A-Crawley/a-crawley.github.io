import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { formatDuration } from "../../game/format.ts";
import { useNumberFormat } from "../../hooks/useNumberFormat.ts";
import { ACHIEVEMENTS } from "../../game/achievements.ts";
import { POLICY_LABELS } from "../../game/itemCopy.ts";
import type { AwaySummary } from "../../game/offline.ts";

export interface AwaySummaryDialogProps {
  /** What happened while away. The dialog is open while this is set. */
  summary: AwaySummary | null;
  onClose: () => void;
}

const GAINS = [
  { key: "food", label: "Food" },
  { key: "wood", label: "Wood" },
  { key: "infra", label: "Infrastructure" },
] as const;

/** "While you were away": how long, what the village made, and anything that changed. */
export function AwaySummaryDialog({ summary, onClose }: AwaySummaryDialogProps) {
  const format = useNumberFormat();
  // Keep showing the last summary while the dialog fades out, so it doesn't go blank.
  const [shown, setShown] = useState(summary);
  if (summary && summary !== shown) setShown(summary);
  if (!shown) return null;

  const gains = GAINS.filter(({ key }) => Math.floor(shown.gained[key]) > 0);
  const stageChanged = shown.stageTo !== shown.stageFrom;

  return (
    <Dialog
      open={summary !== null}
      onClose={onClose}
      aria-labelledby="away-title"
      aria-describedby="away-body"
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="away-title">Welcome back</DialogTitle>
      <DialogContent id="away-body">
        <Typography>You were away for {formatDuration(shown.awaySeconds)}.</Typography>
        {shown.capped && (
          <Typography color="text.secondary">
            Only the first {formatDuration(shown.countedSeconds)} counted.
          </Typography>
        )}
        {shown.rate < 1 && (
          <Typography color="text.secondary">
            With nobody watching, the village worked at {Math.round(shown.rate * 100)}% speed.
          </Typography>
        )}
        {gains.length > 0 ? (
          <List dense aria-label="Gained while away" sx={{ my: 1 }}>
            {gains.map(({ key, label }) => (
              <ListItem key={key} disableGutters sx={{ justifyContent: "space-between" }}>
                <span>{label}</span>
                <strong>+{format.amount(shown.gained[key])}</strong>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ my: 1 }}>
            The village produced nothing, which is also a result.
          </Typography>
        )}
        {shown.storageFull.length > 0 && (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            The {shown.storageFull.join(" and ")} store
            {shown.storageFull.length === 1 ? " was" : "s were"} full, so the village stopped
            gathering. More storage means more to come back to.
          </Typography>
        )}
        {shown.policiesEnded.length > 0 && (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {shown.policiesEnded.map((key) => POLICY_LABELS[key]).join(" and ")}{" "}
            {shown.policiesEnded.length === 1 ? "ended" : "both ended"} when you left. Nobody was
            there to enforce it.
          </Typography>
        )}
        {shown.achievementsEarned.length > 0 && (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Achievements earned while you were gone:{" "}
            {shown.achievementsEarned
              .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id)
              .join(", ")}
            .
          </Typography>
        )}
        {stageChanged && (
          <Typography color="text.secondary">
            The village reached the next stage while you were gone.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Back to work
        </Button>
      </DialogActions>
    </Dialog>
  );
}
