import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

/** The result of trying to import a save. Matches what `useGame().importSave` returns. */
export type ImportOutcome = { ok: true } | { ok: false; error: string };

export interface SaveControlsProps {
  /** Returns the current game as a copy-and-paste string. */
  onExport: () => string;
  /** Tries to replace the game with the pasted string. */
  onImport: (text: string) => ImportOutcome;
  /** Deletes the game and starts again. Only called after the player confirms. */
  onReset: () => void;
}

type Notice = { severity: "success" | "error" | "info"; message: string };

/** Export, import and reset for the player's save. Presentational: it knows nothing about the game. */
export function SaveControls({ onExport, onImport, onReset }: SaveControlsProps) {
  const [exported, setExported] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  function handleExport() {
    setExported(onExport());
    setNotice(null);
  }

  async function handleCopy() {
    if (exported === null) return;
    try {
      await navigator.clipboard.writeText(exported);
      setNotice({ severity: "success", message: "Save copied." });
    } catch {
      setNotice({
        severity: "info",
        message: "Could not copy automatically. Select the text and copy it yourself.",
      });
    }
  }

  function handleImport() {
    const outcome = onImport(pasted);
    if (outcome.ok) {
      setPasted("");
      setExported(null);
      setNotice({ severity: "success", message: "Save imported." });
    } else {
      setNotice({ severity: "error", message: outcome.error });
    }
  }

  function handleConfirmReset() {
    setConfirmingReset(false);
    onReset();
    setExported(null);
    setPasted("");
    setNotice({ severity: "success", message: "Game reset." });
  }

  return (
    <Stack component="section" aria-labelledby="save-controls-heading" spacing={3}>
      <Typography id="save-controls-heading" component="h2" variant="h5">
        Save
      </Typography>

      <Stack spacing={1}>
        <Typography variant="body2">
          The game saves itself. Export a copy to keep a backup or move to another device.
        </Typography>
        <Button variant="outlined" onClick={handleExport} sx={{ alignSelf: "flex-start" }}>
          Export save
        </Button>
        {exported !== null && (
          <>
            <TextField
              label="Your save"
              value={exported}
              multiline
              minRows={3}
              fullWidth
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            <Button variant="outlined" onClick={handleCopy} sx={{ alignSelf: "flex-start" }}>
              Copy save
            </Button>
          </>
        )}
      </Stack>

      <Stack spacing={1}>
        <TextField
          label="Paste a save to import"
          helperText="Importing replaces your current game."
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        <Button
          variant="outlined"
          onClick={handleImport}
          disabled={pasted.trim() === ""}
          sx={{ alignSelf: "flex-start" }}
        >
          Import save
        </Button>
      </Stack>

      {notice && (
        <Alert severity={notice.severity} role={notice.severity === "error" ? "alert" : "status"}>
          {notice.message}
        </Alert>
      )}

      <Stack spacing={1}>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setConfirmingReset(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          Reset game
        </Button>
      </Stack>

      <Dialog
        open={confirmingReset}
        onClose={() => setConfirmingReset(false)}
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
      >
        <DialogTitle id="reset-dialog-title">Reset the game?</DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-dialog-description">
            This deletes your progress and starts again. Export a save first if you might want it
            back.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingReset(false)}>Cancel</Button>
          <Button color="error" onClick={handleConfirmReset}>
            Delete my progress
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
